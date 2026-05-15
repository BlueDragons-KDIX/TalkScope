"""
Geminiを使って、refer_dictionaryとrefer_dictionary_v1のレスポンス速度を比較するテストコード。
前提：テキストは形態素解析済みで、名詞のみの意味を取得する
- refer_dictionaryは、1つの単語に対して、意味説明文を1つ返す。また、1つのプロンプトに対して、1つの単語が入力される前提で実装されている。
- refer_dictionary_v1は、1つの単語に対して、意味説明文を複数返すことができる。また、1つのプロンプトに対して、複数の単語が入力される前提で実装されている

refer_dictionary_v1に期待されることは、1つのプロンプトに詰める事で、リクエスト回数が減り、レスポンス速度が上がること。

処理速度に影響される要素の予想
- リクエスト回数
- プロンプトの長さ（単語数）
- 1つのプロンプトで処理する単語数

refer_dictionary：lookup_term_summary(term)
refer_dictionary_v1：_generate_senses_for_terms(terms: list[str], group_size: int = 10) -> dict[str, list[str]]

テストケース1：単語数1、refer_dictionaryは意味説明文1つ、refer_dictionary_v1は意味説明文3つまで
テストケース2：単語数3、refer_dictionaryは意味説明文1つ、refer_dictionary_v1は意味説明文3つまで
テストケース3：単語数10、リクエスト数の差だけを確認する（API呼び出しはしない）

テスト関数の役割
- test_v1_batches_terms_and_reduces_request_count
  単語数10のケースで、refer_dictionaryが10回リクエストする一方、
  refer_dictionary_v1が1回のリクエストにまとめられることを確認する。API呼び出しはしない。
- test_v1_respects_group_size_when_prompt_is_split
  group_sizeを4にしたとき、10語が4語・4語・2語の3プロンプトに分割され、
  全単語がプロンプトに入ることを確認する。API呼び出しはしない。
- test_latency_report_explains_factors_and_writes_plot
  1語1意味、1語3意味、3語1意味、3語3意味の各ケースで実測し、CSV、Markdownレポート、SVGプロットを出力する。
  Markdownには、リクエスト回数、プロンプト文字数、意味説明文の数が速度に与える影響を記録する。

レスポンス時間の長さと処理速度に影響される要素の予想がテキストで分かるようにする。また、結果をプロットできるようにする。

注意:
- このテストは実運用のGemini APIへリクエストする。
- 実行には Backend/.env などで GEMINI_API_KEY を設定する。
- 1分間に送れるリクエスト数が15程度の想定なので、refer_dictionary_v1を先に呼び、
  返却された意味数に合わせてrefer_dictionary側のリクエスト数を決める。
- case_3_words_3_sense の refer_dictionary は実行せず、レポートでは - 表記にする。
"""

# 変更前メモ:
# テストケース3：単語数10、refer_dictionaryは意味説明文1つ、refer_dictionary_v1は意味説明文3つまで
# test_latency_report_explains_factors_and_writes_plot:
#   単語数1・3・10の各ケースで実測し、CSV、Markdownレポート、SVGプロットを出力する。
# ただし、10語ケースまで実測するとリクエスト数が増えるため、現在はコメントアウトしている。

from __future__ import annotations

import asyncio
import csv
import math
import os
import re
import statistics
import sys
import time
import types
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path

import dotenv
import fastapi
import pytest

dotenv.load_dotenv(Path(__file__).parents[1] / ".env")

import app.services.dictionary as dictionary_service
import app.services.llm.gemini as gemini_llm

# refer_dictionary_v1 は DB CRUD を経由して循環 import しやすい。
# このレイテンシテストではDBを使わないため、CRUDだけ最小スタブに差し替える。
crud_stub = types.ModuleType("app.crud.dictionary")
crud_stub.read_dictionary_by_term = lambda _term: None
crud_stub.create_dictionary = lambda **_kwargs: 1
crud_stub.search_sense_dictionary = lambda terms: []
crud_package_stub = types.ModuleType("app.crud")
crud_package_stub.dictionary = crud_stub
sys.modules.setdefault("app.crud", crud_package_stub)
sys.modules.setdefault("app.crud.dictionary", crud_stub)

import app.services.refer_dictionary_v1 as refer_dictionary_v1


pytestmark = pytest.mark.integration


TERMS = [
    "フライパン",
    "TypeScript",
    "SSE",
    "自然言語処理",
    "Python",
    "機械学習",
    "深層学習",
    "Transformer",
    "BERT",
    "GPT",
]

JST = timezone(timedelta(hours=9), name="JST")
LOG_ARTIFACT_ROOT = Path(__file__).parents[1] / ".log" / "artifacts" / "gemini_latency"

@dataclass(frozen=True)
class Scenario:
    """
    レイテンシ比較の入力条件。

    Args:
        name: 結果表に出すテストケース名
        term_count: 意味を取得したい単語数
        senses_per_term: 1語あたり取得したい意味説明文数
        group_size: v1 が1リクエストに詰める単語数
    """

    name: str
    term_count: int
    senses_per_term: int
    group_size: int = 10


@dataclass(frozen=True)
class LatencyResult:
    """
    方式ごとの実測レイテンシ測定結果。

    Args:
        method: 比較対象の方式名
        term_count: 処理した単語数
        returned_senses_per_term: 返ってきた意味説明文数の合計
        returned_senses_detail: 各単語の返却数を入力順に並べた文字列。例: 2/1/3
        raw_response_chars: dictにマッピングする前のLLMレスポンス文字数の合計
        request_count: Gemini に問い合わせた回数
        prompt_count: 生成したプロンプト数
        total_prompt_chars: Gemini に渡したプロンプト文字数の合計
        elapsed_ms: 実測時間
        min_senses_per_term: 返却された意味説明文数の最小値
        max_senses_per_term: 返却された意味説明文数の最大値
        skipped: 実API呼び出しを省略した行かどうか
        skip_reason: 省略理由
    """

    method: str
    term_count: int
    returned_senses_per_term: int
    returned_senses_detail: str
    raw_response_chars: int
    request_count: int
    prompt_count: int
    total_prompt_chars: int
    elapsed_ms: float
    min_senses_per_term: int
    max_senses_per_term: int
    skipped: bool = False
    skip_reason: str = ""


@dataclass(frozen=True)
class ReportRow:
    """
    レポートに出力する1行分のデータ。

    Args:
        case_name: 読む人が比較条件として使うケース名
        result: 方式ごとの測定結果
        request_order: 実APIを呼んだ順番。スキップ行は対応する比較行の直後に置くための小数にする。
    """

    case_name: str
    result: LatencyResult
    request_order: float


@dataclass(frozen=True)
class ReportContext:
    """
    レポート出力時の実行情報。

    Args:
        executed_at: 実行時刻
        executed_file: 実行したテストファイル名
    """

    executed_at: datetime
    executed_file: Path

    @property
    def directory_timestamp(self) -> str:
        return self.executed_at.strftime("%Y%m%d_%H%M")

    @property
    def filename_timestamp(self) -> str:
        return f"{self.executed_at.strftime('%Y%m%d_%H%M')}_JST"

    @property
    def executed_at_label(self) -> str:
        return self.executed_at.strftime("%Y-%m-%d %H:%M:%S JST")


def _build_report_context() -> ReportContext:
    """
    レポート出力に使う実行時刻とファイル名を作る。

    Returns:
        context: 出力ディレクトリ名、ファイル名、Markdownメタ情報に使う実行情報
    """
    return ReportContext(
        executed_at=datetime.now(JST),
        executed_file=Path(__file__).resolve(),
    )


@dataclass
class LatencyTimer:
    """
    Gemini呼び出し時間を記録する計測器。

    実運用のLLMを呼び出し、方式ごとの総経過時間を比較する。
    """

    prompt_lengths: list[int]
    start_time: float | None
    end_time: float | None

    def __init__(self) -> None:
        self.prompt_lengths = []
        self.start_time = None
        self.end_time = None

    def start(self) -> None:
        self.start_time = time.perf_counter()

    def stop(self) -> None:
        self.end_time = time.perf_counter()

    @property
    def elapsed_ms(self) -> float:
        if self.start_time is None or self.end_time is None:
            return 0.0
        return (self.end_time - self.start_time) * 1000

    @property
    def total_prompt_chars(self) -> int:
        return sum(self.prompt_lengths)

    def add_prompt(self, prompt: str) -> None:
        self.prompt_lengths.append(len(prompt))


SCENARIOS = [
    Scenario("case_1_word_1_sense", term_count=1, senses_per_term=1),
    Scenario("case_1_word_3_sense", term_count=1, senses_per_term=3),
    Scenario("case_3_words_1_sense", term_count=3, senses_per_term=1),
    Scenario("case_3_words_3_sense", term_count=3, senses_per_term=3),
]

GROUP_SIZE_SCENARIOS = [
    Scenario("case_10_words_3_sense_group_5", term_count=10, senses_per_term=3, group_size=5),
    Scenario("case_10_words_3_sense_group_10", term_count=10, senses_per_term=3, group_size=10),
]


def _extract_terms_from_v1_prompt(prompt: str) -> list[str]:
    """
    refer_dictionary_v1 が生成したプロンプトから対象語リストを取り出す。

    Args:
        prompt: _build_prompts が生成したGemini向けプロンプト
    Returns:
        terms: プロンプト末尾の「- 単語」行から復元した単語リスト
    """
    terms_section = prompt.rsplit("単語:", maxsplit=1)[-1]
    return [match.group(1).strip() for match in re.finditer(r"^\s*-\s+(.+?)\s*$", terms_section, re.MULTILINE)]


def _legacy_prompt(term: str) -> str:
    """
    旧方式の1語問い合わせでGeminiに渡すプロンプトを作る。

    Args:
        term: Gemini に問い合わせる単語
    Returns:
        prompt: 1語だけを含む短いプロンプト
    """
    return dictionary_service._build_prompt(term, context=None)


def _build_v1_one_sense_prompts(terms: list[str], group_size: int = 10) -> list[str]:
    """
    refer_dictionary_v1方式で、各単語1つの意味だけを返すプロンプトを作る。

    Args:
        terms: Gemini に問い合わせる単語リスト
        group_size: 1プロンプトにまとめる単語数
    Returns:
        prompts: 各単語1意味のJSON返却を求めるプロンプト一覧
    """
    prompts = []
    for i in range(0, len(terms), group_size):
        terms_group = terms[i:i + group_size]
        terms_str = "\n".join(f"- {term}" for term in terms_group)
        prompts.append(f"""
            あなたは辞書アシスタントです。
            以下の単語それぞれについて、日本語で使われる主要な意味を1つだけ出してください。

            条件:
            - 各単語は独立して処理してください
            - 入力文脈は使わず、一般的な意味を答えてください
            - 専門用語の言い換えを優先し、簡潔に答えてください。
            - 意味は短く具体的にしてください
            - 不明な単語は空配列にしてください
            - 出力はJSONのみとし、説明文は出さないでください
            - JSONのキーは入力された単語と完全に一致させてください
            - 各単語の配列要素は最大1つにしてください

            出力形式(JSON):
            {{
            "単語1": [
                "意味1"
            ],
            "単語2": [
                "意味1"
            ]
            }}

            単語:
            {terms_str}
        """)
    return prompts


def _measure_legacy_terms_by_counts(terms: list[str], sense_counts: list[int]) -> LatencyResult:
    """
    旧方式のレイテンシを測定する。

    Args:
        terms: 問い合わせる単語リスト
        sense_counts: 各単語で取得したい意味説明文数。
            refer_dictionaryは1リクエストで1意味なので、この数だけ同じ単語を問い合わせる。
    Returns:
        result: 旧方式の実測レイテンシ結果
    """
    assert len(terms) == len(sense_counts)

    timer = LatencyTimer()
    prompts_by_term: list[tuple[str, str]] = []

    for term, requested_sense_count in zip(terms, sense_counts):
        for _sense_index in range(requested_sense_count):
            # refer_dictionary側: 1単語1意味につき1プロンプトとして文字数を記録する
            prompt = _legacy_prompt(term)
            timer.add_prompt(prompt)
            prompts_by_term.append((term, prompt))

    timer.start()
    # refer_dictionary側: 実装のasyncio.gatherに近づけるため、Gemini呼び出しを並列に投げる
    lookup_results = asyncio.run(_call_legacy_prompts_parallel(prompts_by_term))

    timer.stop()
    raw_response_chars = sum(len(summary) for _term, summary, _model_name in lookup_results)

    for term, summary, model_name in lookup_results:
        # refer_dictionary側: 通常のlookup_term_summaryと同じレスポンスdictへ整形する
        result = dictionary_service._build_lookup_result(term, summary, model_name)
        assert result["term"] == term
        assert isinstance(result["summary"], str)
        assert result["summary"].strip()

    return LatencyResult(
        method="refer_dictionary",
        term_count=len(terms),
        returned_senses_per_term=sum(sense_counts),
        returned_senses_detail="/".join(str(count) for count in sense_counts),
        raw_response_chars=raw_response_chars,
        request_count=sum(sense_counts),
        prompt_count=sum(sense_counts),
        total_prompt_chars=timer.total_prompt_chars,
        elapsed_ms=timer.elapsed_ms,
        min_senses_per_term=min(sense_counts, default=0),
        max_senses_per_term=max(sense_counts, default=0),
    )


async def _call_legacy_prompts_parallel(prompts_by_term: list[tuple[str, str]]) -> list[tuple[str, str, str]]:
    """
    refer_dictionary側のGemini呼び出しを並列実行する。

    Args:
        prompts_by_term: term と prompt のペア
    Returns:
        results: term, summary, model_name のリスト
    """
    async def _worker(term: str, prompt: str) -> tuple[str, str, str]:
        summary, model_name = await asyncio.to_thread(dictionary_service._call_gemini, prompt)
        return term, summary, model_name

    return await asyncio.gather(*(_worker(term, prompt) for term, prompt in prompts_by_term))


def _build_skipped_legacy_result(terms: list[str], reason: str) -> LatencyResult:
    """
    refer_dictionary側の実行を省略した行を作る。

    Args:
        terms: 対象単語リスト
        reason: 省略理由
    Returns:
        result: レポートで - 表記するための結果
    """
    return LatencyResult(
        method="refer_dictionary",
        term_count=len(terms),
        returned_senses_per_term=0,
        returned_senses_detail="-",
        raw_response_chars=0,
        request_count=0,
        prompt_count=0,
        total_prompt_chars=0,
        elapsed_ms=0.0,
        min_senses_per_term=0,
        max_senses_per_term=0,
        skipped=True,
        skip_reason=reason,
    )


def _build_skipped_v1_result(terms: list[str], reason: str) -> LatencyResult:
    """
    refer_dictionary_v1側の実行失敗をレポート行に残す。

    Args:
        terms: 対象単語リスト
        reason: 省略理由
    Returns:
        result: レポートで - 表記するための結果
    """
    return LatencyResult(
        method="refer_dictionary_v1",
        term_count=len(terms),
        returned_senses_per_term=0,
        returned_senses_detail="-",
        raw_response_chars=0,
        request_count=0,
        prompt_count=0,
        total_prompt_chars=0,
        elapsed_ms=0.0,
        min_senses_per_term=0,
        max_senses_per_term=0,
        skipped=True,
        skip_reason=reason,
    )


def _measure_v1_terms(terms: list[str], senses_per_term: int, group_size: int) -> LatencyResult:
    """
    v1方式のレイテンシを測定する。

    Args:
        terms: 問い合わせる単語リスト
        senses_per_term: 1語あたり取得したい意味説明文数
        group_size: 1リクエストにまとめる単語数
    Returns:
        result: v1方式の実測レイテンシ結果
    """
    timer = LatencyTimer()
    raw_response_chars = 0
    senses: dict[str, list[str]] = {}
    # refer_dictionary_v1側: 1意味ケースはローカル関数、3意味ケースは既存の_build_promptsを使う
    if senses_per_term == 1:
        prompts = _build_v1_one_sense_prompts(terms, group_size=group_size)
    else:
        prompts = refer_dictionary_v1._build_prompts(terms, group_size=group_size)

    for prompt in prompts:
        # refer_dictionary_v1側: まとめたプロンプトの文字数を記録する
        timer.add_prompt(prompt)

    timer.start()
    for prompt in prompts:
        # refer_dictionary_v1側: dictにマッピングする前のJSON文字列を取得して長さを測る
        response_text = gemini_llm._call_gemini(prompt)
        raw_response_chars += len(response_text)
        # refer_dictionary_v1側: _generate_senses_for_terms内部と同じJSON parseを行う
        senses.update(gemini_llm._parse_json_response(response_text))
    timer.stop()

    assert set(senses) == set(terms)
    assert all(isinstance(term_senses, list) for term_senses in senses.values())
    assert all(len(term_senses) <= senses_per_term for term_senses in senses.values())

    sense_counts = [len(senses[term]) for term in terms]

    return LatencyResult(
        method="refer_dictionary_v1",
        term_count=len(terms),
        returned_senses_per_term=sum(sense_counts),
        returned_senses_detail="/".join(str(count) for count in sense_counts),
        raw_response_chars=raw_response_chars,
        request_count=len(prompts),
        prompt_count=len(prompts),
        total_prompt_chars=timer.total_prompt_chars,
        elapsed_ms=timer.elapsed_ms,
        min_senses_per_term=min(sense_counts, default=0),
        max_senses_per_term=max(sense_counts, default=0),
    )


@pytest.fixture
def require_gemini_api_key() -> None:
    """
    Gemini APIキーがない環境ではライブ性能テストをスキップする。

    ユースケース:
      - Backend/.env を load_dotenv で読み、実運用のLLMを使う。
      - APIキーがないCIやローカル環境では意図せず外部通信しない。
    """
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY is not configured")


def test_v1_batches_terms_and_reduces_request_count() -> None:
    """
    ユースケース:
      10語を調べるとき、旧方式は10回問い合わせるが、v1は1回にまとめられる。
    """
    terms = TERMS[:10]

    # 旧方式: 10語なら1語ずつ10リクエストになる。ここではAPIを叩かず回数だけ確認する
    legacy_request_count = len(terms)
    # v1方式: 10語を1つのプロンプトにまとめられる。ここではAPIを叩かずプロンプト数だけ確認する
    v1_request_count = len(refer_dictionary_v1._build_prompts(terms, group_size=10))

    assert legacy_request_count == 10
    assert v1_request_count == 1
    assert v1_request_count < legacy_request_count


def test_v1_respects_group_size_when_prompt_is_split() -> None:
    """
    ユースケース:
      group_sizeを小さくした場合でも、v1は単語を漏らさず複数プロンプトへ分割する。
    """
    terms = TERMS[:10]

    # v1方式: group_size=4でプロンプトを4語・4語・2語に分割する
    prompts = refer_dictionary_v1._build_prompts(terms, group_size=4)
    # テスト補助: 生成されたプロンプトから対象語を取り出して分割数を確認する
    prompt_terms = [_extract_terms_from_v1_prompt(prompt) for prompt in prompts]
    flattened_prompt_terms = [term for group in prompt_terms for term in group]

    assert [len(group) for group in prompt_terms] == [4, 4, 2]
    assert flattened_prompt_terms == terms


def test_latency_report_explains_factors_and_writes_plot(require_gemini_api_key) -> None:
    """
    ユースケース:
      単語数・意味数ごとの比較結果を、人が読めるMarkdownとプロット用ファイルに残す。
    """
    results: list[tuple[Scenario, LatencyResult, LatencyResult]] = []
    report_rows: list[ReportRow] = []
    report_context = _build_report_context()
    request_order = 0

    for scenario in SCENARIOS:
        terms = TERMS[: scenario.term_count]

        # refer_dictionary_v1を先に呼び、最大3件指定でも実際に返った件数を記録する
        request_order += 1
        v1_request_order = request_order
        v1 = _measure_v1_terms(
            terms,
            senses_per_term=scenario.senses_per_term,
            group_size=scenario.group_size,
        )
        v1_sense_counts = [int(count) for count in v1.returned_senses_detail.split("/")]

        if scenario.name == "case_3_words_3_sense":
            # 結果が多リクエストになることは分かっているため、15RPM回避のため実行しない
            legacy = _build_skipped_legacy_result(
                terms,
                reason=f"{scenario.name}はrefer_dictionaryで多リクエストになるため未実行",
            )
            legacy_request_order = v1_request_order + 0.1
        else:
            # refer_dictionary側: refer_dictionary_v1が実際に返した意味数に合わせて問い合わせる
            request_order += 1
            legacy_request_order = request_order
            legacy = _measure_legacy_terms_by_counts(terms, sense_counts=v1_sense_counts)

        results.append((scenario, legacy, v1))
        # レポート: caseとmethodの組み合わせで読めるように、1シナリオにつき2行だけ出す
        report_rows.extend(
            [
                ReportRow(scenario.name, legacy, legacy_request_order),
                ReportRow(scenario.name, v1, v1_request_order),
            ]
        )

    artifact_dir = LOG_ARTIFACT_ROOT / report_context.directory_timestamp
    artifact_dir.mkdir(parents=True, exist_ok=True)
    csv_path = artifact_dir / f"gemini_latency_results_{report_context.filename_timestamp}.csv"
    markdown_path = artifact_dir / f"gemini_latency_report_{report_context.filename_timestamp}.md"
    svg_path = artifact_dir / f"gemini_latency_plot_{report_context.filename_timestamp}.svg"
    # 出力: 数値比較をCSVに保存する
    _write_csv(csv_path, report_rows)
    # 出力: 速度に影響する要素と読み取りメモをMarkdownに保存する
    _write_markdown(markdown_path, report_rows, report_context)
    # 出力: group_size比較も同じMarkdownに追記する
    group_size_rows, group_size_terms = _measure_group_size_rows()
    _append_group_size_markdown(
        markdown_path,
        group_size_rows,
        report_context,
        terms=group_size_terms,
    )
    # 出力: 実測時間の棒グラフをSVGに保存する
    _write_svg_plot(svg_path, results)

    report_text = markdown_path.read_text(encoding="utf-8")

    assert report_context.directory_timestamp in str(markdown_path)
    assert report_context.filename_timestamp in markdown_path.name
    assert "実行時刻" in report_text
    assert "実行ファイル" in report_text
    assert "速度に影響する要素" in report_text
    assert "リクエスト回数" in report_text
    assert "プロンプト文字数" in report_text
    assert "意味説明文の数" in report_text
    assert "returned senses detail" in report_text
    assert "raw response chars" in report_text
    assert "group_size比較" in report_text
    assert "case_10_words_3_sense_group_5" in report_text
    assert "case_10_words_3_sense_group_10" in report_text
    assert csv_path.exists()
    assert svg_path.exists()

    multi_term_rows = [
        (legacy, v1)
        for scenario, legacy, v1 in results
        if scenario.term_count > 1 and not legacy.skipped
    ]
    assert all(v1.request_count < legacy.request_count for legacy, v1 in multi_term_rows)


def _measure_group_size_rows() -> tuple[list[ReportRow], list[str]]:
    """
    10語3意味ケースで、refer_dictionary_v1のgroup_size違いを測定する。

    Returns:
        rows: group_size比較のレポート行
        terms: 比較で共通して使った単語群
    """
    report_rows: list[ReportRow] = []
    request_order = 0
    group_size_terms = TERMS[:10]

    for scenario in GROUP_SIZE_SCENARIOS:
        terms = group_size_terms
        assert len(terms) == scenario.term_count

        # refer_dictionary_v1だけを実行し、group_sizeごとのリクエスト数と時間を比較する
        request_order += 1
        try:
            v1 = _measure_v1_terms(
                terms,
                senses_per_term=scenario.senses_per_term,
                group_size=scenario.group_size,
            )
        except fastapi.HTTPException as exc:
            v1 = _build_skipped_v1_result(
                terms,
                reason=f"{scenario.name}はGemini APIエラーのため未実行扱い: {exc.status_code} {exc.detail}",
            )
        legacy = _build_skipped_legacy_result(
            terms,
            reason="group_size比較ではrefer_dictionaryを実行しない",
        )
        report_rows.append(ReportRow(scenario.name, v1, request_order))

    return report_rows, group_size_terms


def _write_csv(path: Path, rows: list[ReportRow]) -> None:
    """
    比較結果をCSVで保存する。

    Args:
        path: 出力先CSV
        rows: レポートに出力する行
    """
    with path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(
            [
                "case",
                "method",
                "term_count",
                "returned_senses_per_term",
                "returned_senses_detail",
                "raw_response_chars",
                "min_senses_per_term",
                "max_senses_per_term",
                "request_count",
                "prompt_count",
                "total_prompt_chars",
                "elapsed_ms",
                "skip_reason",
            ]
        )
        for row in sorted(rows, key=lambda item: item.request_order):
            result = row.result
            writer.writerow(
                [
                    row.case_name,
                    result.method,
                    result.term_count,
                    _format_cell(result, "returned_senses_per_term"),
                    result.returned_senses_detail,
                    _format_cell(result, "raw_response_chars"),
                    _format_cell(result, "min_senses_per_term"),
                    _format_cell(result, "max_senses_per_term"),
                    _format_cell(result, "request_count"),
                    _format_cell(result, "prompt_count"),
                    _format_cell(result, "total_prompt_chars"),
                    _format_elapsed_ms(result),
                    result.skip_reason,
                ]
            )


def _append_group_size_markdown(
    path: Path,
    rows: list[ReportRow],
    context: ReportContext,
    terms: list[str],
) -> None:
    """
    既存のlatency reportにgroup_size比較の表を追記する。

    Args:
        path: 追記先Markdown
        rows: group_size比較の結果行
        context: 実行時刻と実行ファイル名
        terms: group_size比較で共通して使った単語群
    """
    if not path.exists():
        _write_markdown(path, [], context)

    lines = [
        "",
        "## group_size比較",
        "",
        "- この表は refer_dictionary_v1 の group_size 比較だけを行う。",
        "- group_size=5 は10語を2リクエストに分け、group_size=10 は10語を1リクエストにまとめる。",
        f"- 比較に使う単語群は全行で同じ: {', '.join(terms)}",
        "",
        "| case | method | terms | returned senses | returned senses detail | raw response chars | min senses | max senses | requests | prompt chars | elapsed ms | skip reason |",
        "| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]

    for row in sorted(rows, key=lambda item: item.request_order):
        result = row.result
        lines.append(
            "| "
            f"{row.case_name} | "
            f"{result.method} | "
            f"{result.term_count} | "
            f"{_format_cell(result, 'returned_senses_per_term')} | "
            f"{result.returned_senses_detail} | "
            f"{_format_cell(result, 'raw_response_chars')} | "
            f"{_format_cell(result, 'min_senses_per_term')} | "
            f"{_format_cell(result, 'max_senses_per_term')} | "
            f"{_format_cell(result, 'request_count')} | "
            f"{_format_cell(result, 'total_prompt_chars')} | "
            f"{_format_elapsed_ms(result)} | "
            f"{result.skip_reason} |"
        )

    with path.open("a", encoding="utf-8") as markdown_file:
        markdown_file.write("\n".join(lines))
        markdown_file.write("\n")


def _format_cell(result: LatencyResult, attr_name: str) -> str | int:
    """
    スキップ行を - 表記にする。

    Args:
        result: 出力対象の測定結果
        attr_name: LatencyResult の属性名
    Returns:
        value: 通常行は実値、スキップ行は -
    """
    if result.skipped:
        return "-"
    return getattr(result, attr_name)


def _format_elapsed_ms(result: LatencyResult) -> str:
    """
    elapsed_msをMarkdown/CSV向けに整形する。

    Args:
        result: 出力対象の測定結果
    Returns:
        value: 通常行は小数2桁、スキップ行は -
    """
    if result.skipped:
        return "-"
    return f"{result.elapsed_ms:.2f}"


def _write_markdown(
    path: Path,
    rows: list[ReportRow],
    context: ReportContext,
    extra_notes: list[str] | None = None,
    include_speedup_note: bool = True,
) -> None:
    """
    比較結果をMarkdownレポートで保存する。

    Args:
        path: 出力先Markdown
        rows: レポートに出力する行
        context: 実行時刻と実行ファイル名
        extra_notes: 読み取りメモに追加する補足
        include_speedup_note: refer_dictionary と refer_dictionary_v1 の速度比を出すかどうか
    """
    lines = [
        "# Gemini latency comparison",
        "",
        "## 実行情報",
        "",
        f"- 実行時刻: {context.executed_at_label}",
        f"- 実行ファイル: {context.executed_file.name}",
        f"- 実行ファイルパス: {context.executed_file}",
        "",
        "## 速度に影響する要素",
        "",
        "- リクエスト回数: refer_dictionary は単語数ぶん増える。v1 は group_size ごとにまとまる。",
        "- プロンプト文字数: v1 は1回のプロンプトが長くなるため、単語数に応じて増える。",
        "- 意味説明文の数: v1 は最大3件返せるぶん、1回の生成量は増える。",
        "- 生レスポンス文字数: dictにマッピングする前のLLM応答が長いほど、生成量が多い可能性がある。",
        "- 並列性: 旧方式は理想的に並列化すると待ち時間が短く見えるが、API制限や接続数の影響を受けやすい。",
        "- このレポートでは、refer_dictionary側のGemini呼び出しを並列実行して測定する。",
        "",
        "## 結果",
        "",
        "| case | method | terms | returned senses | returned senses detail | raw response chars | min senses | max senses | requests | prompt chars | elapsed ms | skip reason |",
        "| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]

    for row in sorted(rows, key=lambda item: item.request_order):
        result = row.result
        lines.append(
            "| "
            f"{row.case_name} | "
            f"{result.method} | "
            f"{result.term_count} | "
            f"{_format_cell(result, 'returned_senses_per_term')} | "
            f"{result.returned_senses_detail} | "
            f"{_format_cell(result, 'raw_response_chars')} | "
            f"{_format_cell(result, 'min_senses_per_term')} | "
            f"{_format_cell(result, 'max_senses_per_term')} | "
            f"{_format_cell(result, 'request_count')} | "
            f"{_format_cell(result, 'total_prompt_chars')} | "
            f"{_format_elapsed_ms(result)} | "
            f"{result.skip_reason} |"
        )

    v1_speedups = []
    if include_speedup_note:
        v1_speedups = [
            old_row.result.elapsed_ms / v1_row.result.elapsed_ms
            for old_row, v1_row in zip(rows[0::2], rows[1::2])
            if not old_row.result.skipped and v1_row.result.elapsed_ms > 0
        ]
    average_speedup = statistics.mean(v1_speedups) if v1_speedups else 0.0
    lines.extend(
        [
            "",
            "## 読み取りメモ",
            "",
            "- 単語数が増えるほど、リクエスト固定費をまとめられる v1 の効果が出やすい。",
            "- 1語だけの場合は、v1 の長いプロンプトのぶん差が小さくなる可能性がある。",
            "- refer_dictionary は1語1意味の設計なので、複数意味が必要な場合は返却できる情報量にも差が出る。",
        ]
    )
    if include_speedup_note:
        lines.insert(lines.index("## プロット") if "## プロット" in lines else len(lines), f"- 実測では、v1 は平均 {average_speedup:.2f} 倍速い。")
    if extra_notes:
        lines.extend(extra_notes)
    lines.extend(
        [
            "",
            "## プロット",
            "",
            "同じディレクトリのSVGファイルを参照。",
            "",
        ]
    )

    path.write_text("\n".join(lines), encoding="utf-8")


def _write_svg_plot(path: Path, results: list[tuple[Scenario, LatencyResult, LatencyResult]]) -> None:
    """
    標準ライブラリだけで簡易SVG棒グラフを保存する。

    Args:
        path: 出力先SVG
        results: シナリオと方式別レイテンシ結果
    """
    width = 980
    height = 420
    margin_left = 80
    margin_bottom = 120
    chart_width = width - margin_left - 40
    chart_height = height - 60 - margin_bottom
    baseline = 60 + chart_height
    max_ms = max(max(legacy.elapsed_ms, v1.elapsed_ms) for _s, legacy, v1 in results)
    bar_group_width = chart_width / len(results)
    bar_width = min(28, bar_group_width / 4)

    svg: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#ffffff"/>',
        '<text x="80" y="30" font-family="sans-serif" font-size="18" font-weight="700">Gemini latency comparison</text>',
        f'<line x1="{margin_left}" y1="{baseline}" x2="{width - 30}" y2="{baseline}" stroke="#333"/>',
        f'<line x1="{margin_left}" y1="60" x2="{margin_left}" y2="{baseline}" stroke="#333"/>',
        '<text x="80" y="55" font-family="sans-serif" font-size="12" fill="#555">elapsed ms</text>',
    ]

    for index, (scenario, legacy, v1) in enumerate(results):
        group_x = margin_left + index * bar_group_width + bar_group_width / 2
        for offset, result, color in (
            (-bar_width / 1.8, v1, "#0f9d7a"),
            (bar_width / 1.8, legacy, "#5b7cfa"),
        ):
            bar_height = 0 if max_ms == 0 or result.skipped else (result.elapsed_ms / max_ms) * chart_height
            x = group_x + offset - bar_width / 2
            y = baseline - bar_height
            svg.append(
                f'<rect x="{x:.2f}" y="{y:.2f}" width="{bar_width:.2f}" height="{bar_height:.2f}" fill="{color}"/>'
            )
            svg.append(
                f'<text x="{x + bar_width / 2:.2f}" y="{y - 5:.2f}" text-anchor="middle" '
                f'font-family="sans-serif" font-size="10" fill="#333">'
                f'{"-" if result.skipped else math.ceil(result.elapsed_ms)}</text>'
            )

        label = scenario.name.replace("case_", "").replace("_", " ")
        svg.append(
            f'<text x="{group_x:.2f}" y="{baseline + 18}" text-anchor="end" '
            f'font-family="sans-serif" font-size="10" transform="rotate(-35 {group_x:.2f} {baseline + 18})">{label}</text>'
        )

    svg.extend(
        [
            '<rect x="760" y="20" width="12" height="12" fill="#5b7cfa"/>',
            '<text x="778" y="31" font-family="sans-serif" font-size="12">refer_dictionary</text>',
            '<rect x="760" y="40" width="12" height="12" fill="#0f9d7a"/>',
            '<text x="778" y="51" font-family="sans-serif" font-size="12">refer_dictionary_v1</text>',
            "</svg>",
        ]
    )

    path.write_text("\n".join(svg), encoding="utf-8")

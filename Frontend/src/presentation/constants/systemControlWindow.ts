/** 操作パネル（削除不可の専用ウィンドウ）のレイアウト上の ID */
export const SYSTEM_CONTROL_WINDOW_ID = 'systemControl' as const

/**
 * 操作ウィンドウがレイアウト上で確保する最小サイズ（px）。
 * これより狭い／低いと主要ボタンが潰れるため、分割ペインとウィンドウ本体の双方で下限を張る。
 */
export const SYSTEM_CONTROL_CONTENT_MIN_WIDTH_PX = 168
export const SYSTEM_CONTROL_CONTENT_MIN_HEIGHT_PX = 156

/**
 * レイアウト上の最小高はウィンドウヘッダーを含む。
 * SystemControlWindow 本体はヘッダー下に描画されるため、同じ値を使うと下部ボタンが見切れる。
 */
export const SYSTEM_CONTROL_DOCK_HEADER_RESERVE_PX = 36
export const SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX = SYSTEM_CONTROL_CONTENT_MIN_WIDTH_PX
export const SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX =
  SYSTEM_CONTROL_CONTENT_MIN_HEIGHT_PX + SYSTEM_CONTROL_DOCK_HEADER_RESERVE_PX

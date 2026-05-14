/** 操作パネル（削除不可の専用ウィンドウ）のレイアウト上の ID */
export const SYSTEM_CONTROL_WINDOW_ID = 'systemControl' as const

/**
 * 操作ウィンドウがレイアウト上で確保する最小サイズ（px）。
 * これより狭い／低いと主要ボタンが潰れるため、分割ペインとウィンドウ本体の双方で下限を張る。
 */
export const SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX = 156
export const SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX = 196

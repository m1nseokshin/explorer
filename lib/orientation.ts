/**
 * 화각 계산. 손 제스처 줌과 가상 카메라 FOV를 잇는 유일한 지점이다.
 *
 * (기기 자이로 관련 코드는 제거했다 — 이 프로젝트의 조작은 전부 손 모션캡처다.)
 */

/**
 * 실제로 화면에 보이는 수직 FOV(도).
 *
 * 웹 표준에는 카메라 실화각을 알려주는 API가 없으므로 가정값에서 유도한다.
 * videoW/H를 0으로 넘기면 뷰포트 종횡비만 쓴다.
 */
export function visibleFovY(
  videoW: number,
  videoH: number,
  screenW: number,
  screenH: number,
  zoom: number,
  assumedHFovDeg: number,
): number {
  const aVideo = videoW > 0 && videoH > 0 ? videoW / videoH : 0;
  const aScreen = screenH > 0 ? screenW / screenH : 9 / 16;
  const a = Math.max(aVideo, aScreen, 1e-3);
  const tanH = Math.tan((assumedHFovDeg * Math.PI) / 360);

  let tanV = tanH / a;
  // ⚠️ 가로 기준만 쓰면 화면이 넓을수록 세로가 눌린다. 21:9 모니터에서는
  //    세로가 42°까지 좁아져서, 가로로는 넓은데도 '확대된' 느낌이 든다.
  //    세로 하한을 둬야 하늘이 띠처럼 깔리지 않는다.
  tanV = Math.max(tanV, Math.tan((MIN_V_FOV_DEG * Math.PI) / 360));
  // 그 하한을 지키려다 가로가 한없이 넓어지면 가장자리가 심하게 늘어난다.
  tanV = Math.min(tanV, Math.tan((MAX_H_FOV_DEG * Math.PI) / 360) / a);

  return (2 * Math.atan(tanV / Math.max(zoom, 1e-3)) * 180) / Math.PI;
}

/**
 * 기준 수평 화각. 줌 1배일 때 얼마나 보이는지를 정한다.
 *
 * ⚠️ 세로 화각은 여기서 화면 종횡비로 나눠 나온다. 그래서 이 값이 실제로
 *    체감되는 건 '가로로 넓은 화면'뿐이다 — 모바일 세로에서는 계산된 세로
 *    화각이 100° 상한에 먼저 걸려서 이 값을 바꿔도 화면이 그대로다.
 *    67°일 때 16:9 데스크톱은 세로가 40°까지 좁아져서 별자리 하나가 화면을
 *    꽉 채웠다. 82°면 52°가 되어 주변 별자리까지 함께 들어온다.
 *    더 키우면 원근 왜곡이 가장자리에서 눈에 띈다(82°에서 1.33배).
 */
export const DEFAULT_H_FOV_DEG = 82;

/** 배율 1에서 보장하는 최소 세로 화각(도). 가로로 긴 화면을 위한 하한이다. */
export const MIN_V_FOV_DEG = 58;
/** 위 하한을 지키느라 가로가 넘어가면 안 되는 상한(도). 원근 왜곡의 한계선. */
export const MAX_H_FOV_DEG = 100;

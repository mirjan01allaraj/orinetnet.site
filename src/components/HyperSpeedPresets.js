export const hyperspeedPresets = {
  one: {
    onSpeedUp: () => {},
    onSlowDown: () => {},

    distortion: "turbulentDistortion",

    length: 400,
    roadWidth: 10,
    islandWidth: 2,
    lanesPerRoad: 4,

    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,

    carLightsFade: 0.4,
    totalSideLightSticks: 20,
    lightPairsPerRoadWay: 40,

    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,

    lightStickWidth: [0.12, 0.5],
    lightStickHeight: [1.3, 1.7],

    movingAwaySpeed: [60, 80],
    movingCloserSpeed: [-120, -160],

    carLightsLength: [400 * 0.03, 400 * 0.2],
    carLightsRadius: [0.05, 0.14],
    carWidthPercentage: [0.3, 0.5],
    carShiftX: [-0.8, 0.8],
    carFloorSeparation: [0, 5],

    colors: {
      roadColor: 0x080808,
      islandColor: 0x0a0a0a,
      background: 0x000000,

      shoulderLines: 0xffffff,
      brokenLines: 0xffffff,

      leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
      rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
      sticks: 0x03b3c3,
    },
  },

  orient: {
    onSpeedUp: () => {},
    onSlowDown: () => {},

    distortion: "turbulentDistortion",

    length: 300,
    roadWidth: 8,
    islandWidth: 2,
    lanesPerRoad: 4,

    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,

    carLightsFade: 0.25,
    totalSideLightSticks: 36,
    lightPairsPerRoadWay: 80,

    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,

    lightStickWidth: [0.12, 0.5],
    lightStickHeight: [1.3, 1.7],

    movingAwaySpeed: [60, 80],
    movingCloserSpeed: [-120, -160],

    carLightsLength: [300 * 0.03, 300 * 0.2],
    carLightsRadius: [0.05, 0.14],
    carWidthPercentage: [0.3, 0.5],
    carShiftX: [-0.8, 0.8],
    carFloorSeparation: [0, 5],

    colors: {
      roadColor: 0x02070a,
      islandColor: 0x02070a,
      background: 0x000000,

      shoulderLines: 0x1b57d3,
      brokenLines: 0x55c22a,

      // Left-side line/cars colors
      leftCars: [0x1b57d3, 0x35c9e8, 0x4064b5, 0x8b5cf6],

      // Right-side line/cars colors
      rightCars: [0x55c22a, 0x35c9e8, 0x03b3c3, 0xff7a1a],

      // Vertical side sticks
      sticks: 0x35c9e8,
    },
  },

  orientBlueGreen: {
    onSpeedUp: () => {},
    onSlowDown: () => {},

    distortion: "turbulentDistortion",

    length: 300,
    roadWidth: 8,
    islandWidth: 2,
    lanesPerRoad: 4,

    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,

    carLightsFade: 0.25,
    totalSideLightSticks: 36,
    lightPairsPerRoadWay: 80,

    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,

    lightStickWidth: [0.12, 0.5],
    lightStickHeight: [1.3, 1.7],

    movingAwaySpeed: [60, 80],
    movingCloserSpeed: [-120, -160],

    carLightsLength: [300 * 0.03, 300 * 0.2],
    carLightsRadius: [0.05, 0.14],
    carWidthPercentage: [0.3, 0.5],
    carShiftX: [-0.8, 0.8],
    carFloorSeparation: [0, 5],

    colors: {
      roadColor: 0x02070a,
      islandColor: 0x02070a,
      background: 0x000000,

      shoulderLines: 0x1b57d3,
      brokenLines: 0x55c22a,

      leftCars: [0x1b57d3, 0x27bcd8, 0x4064b5],
      rightCars: [0x55c22a, 0x27bcd8, 0x03b3c3],
      sticks: 0x27bcd8,
    },
  },

  orientCyanOnly: {
    onSpeedUp: () => {},
    onSlowDown: () => {},

    distortion: "turbulentDistortion",

    length: 300,
    roadWidth: 8,
    islandWidth: 2,
    lanesPerRoad: 4,

    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,

    carLightsFade: 0.25,
    totalSideLightSticks: 36,
    lightPairsPerRoadWay: 80,

    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,

    lightStickWidth: [0.12, 0.5],
    lightStickHeight: [1.3, 1.7],

    movingAwaySpeed: [60, 80],
    movingCloserSpeed: [-120, -160],

    carLightsLength: [300 * 0.03, 300 * 0.2],
    carLightsRadius: [0.05, 0.14],
    carWidthPercentage: [0.3, 0.5],
    carShiftX: [-0.8, 0.8],
    carFloorSeparation: [0, 5],

    colors: {
      roadColor: 0x02070a,
      islandColor: 0x02070a,
      background: 0x000000,

      shoulderLines: 0x27bcd8,
      brokenLines: 0x35c9e8,

      leftCars: [0x27bcd8, 0x35c9e8, 0x03b3c3],
      rightCars: [0x27bcd8, 0x35c9e8, 0x03b3c3],
      sticks: 0x27bcd8,
    },
  },
};
import React, { useState } from 'react';
import { View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const THRESHOLD = 60;
const SIZE = 30;
const BORDER = 3;
const HALF = SIZE / 2;
const GAP = 4;

function QuarterArc({ progress, quarterIndex }) {
  // Each quarter covers a 0.25 window of progress, with slight overlap
  const start = quarterIndex * 0.25;
  const end = start + 0.25;

  const style = useAnimatedStyle(() => {
    const p = Math.min(Math.abs(progress.value), 1);
    const localP = Math.max(0, Math.min(1, (p - start) / (end - start)));
    const deg = localP * 90;
    const visible = p > start ? 1 : 0;
    return {
      transform: [{ rotate: `${deg}deg` }],
      opacity: visible,
    };
  });

  const clipStyles = [
    { top: 0,    left: HALF,  width: HALF, height: HALF },
    { top: HALF, left: HALF,  width: HALF, height: HALF },
    { top: HALF, left: 0,     width: HALF, height: HALF },
    { top: 0,    left: 0,     width: HALF, height: HALF },
  ];

  const ringOffsets = [
    { left: -HALF, top: 0    },
    { left: -HALF, top: -HALF}, 
    { left: 0,     top: -HALF},
    { left: 0,     top: 0    },
  ];

  const clip = clipStyles[quarterIndex];
  const offset = ringOffsets[quarterIndex];

  return (
    <View style={[{ position: 'absolute', overflow: 'hidden' }, clip]}>
      <Animated.View style={[{
        position: 'absolute',
        width: SIZE,
        height: SIZE,
      }, offset, style]}>
        <View style={{
          width: SIZE,
          height: SIZE,
          borderRadius: HALF,
          borderWidth: BORDER,
          borderColor: '#5B8BF5',
          position: 'absolute',
        }} />
      </Animated.View>
    </View>
  );
}

function ArcRing({ progress }) {
  return (
    <View style={{ width: SIZE, height: SIZE, position: 'absolute' }}>

      <View style={{
        position: 'absolute',
        width: SIZE, height: SIZE,
        borderRadius: HALF,
        borderWidth: BORDER,
        borderColor: 'rgba(136,136,136,0.18)',
      }} />

      <QuarterArc progress={progress} quarterIndex={0} />
      <QuarterArc progress={progress} quarterIndex={1} />
      <QuarterArc progress={progress} quarterIndex={2} />
      <QuarterArc progress={progress} quarterIndex={3} />
      
    </View>
  );
}

function ReplyIndicator({ progress, side, translateX }) {
  const APPEAR_THRESHOLD = 36 / THRESHOLD;

  const containerStyle = useAnimatedStyle(() => {
    const p = Math.min(Math.abs(progress.value), 1);
    const tx = translateX.value;

    const opacity = interpolate(
      p,
      [0, APPEAR_THRESHOLD, APPEAR_THRESHOLD + 0.1],
      [0, 0, 1],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      p,
      [APPEAR_THRESHOLD, 1],
      [0.4, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [
        { translateX: side === 'right' ? tx - SIZE - GAP : tx + SIZE + GAP },
        { scale }, 
      ],
    };
  });

  const arrowStyle = useAnimatedStyle(() => {
    const p = Math.min(Math.abs(progress.value), 1);

    const opacity = interpolate(p, [0.6, 0.85], [0, 1], Extrapolate.CLAMP);
    const scale = interpolate(p, [0.6, 1], [0.4, 1], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [
        { scale },
        { translateY: -2.5 }, 
        {
          rotate: side === 'right'
            ? `${interpolate(p, [0, 1], [-35, 0], Extrapolate.CLAMP)}deg`
            : `${interpolate(p, [0, 1], [35, 0], Extrapolate.CLAMP)}deg`,
        },
      ],
    };
  });
  
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: SIZE, 
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      top: '50%',
      marginTop: -SIZE / 2,
      ...(side === 'right' ? { left: 0 } : { right: 0 }),
    }, containerStyle]}>
      
      <ArcRing progress={progress} />
      
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Animated.Text 
            allowFontScaling={false}
            style={[
              { 
                color: '#5B8BF5',
                fontSize: 20, 
                fontWeight: '600',
                includeFontPadding: false,
                // textAlignVertical: 'center',
                offset: { width: 0, height: -10 }, // Nudge up by 1px to visually center with the ring
              }, arrowStyle
            ]}>
              {side === 'right' ? '↪' : '↩'}
          </Animated.Text>
        </View>
      </Animated.View>
    );
  }

export function SwipeableMessageRight({ children, onSwipe }) {
  const translateX = useSharedValue(0);
  const progress = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activeOffsetX([10, 999])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      if (e.translationX > 0) {
        translateX.value = Math.min(e.translationX * 0.4, THRESHOLD * 0.7);
        progress.value = Math.min(e.translationX / THRESHOLD, 1);
      }
    })
    .onEnd((e) => {
      if (e.translationX > THRESHOLD) runOnJS(onSwipe)();
      translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
      progress.value = withTiming(0, { duration: 250 });
    })
    .onFinalize(() => {
      translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
      progress.value = withTiming(0, { duration: 250 });
    });

  const messageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ alignSelf: 'flex-start' }}>
        <Animated.View style={messageStyle}>
          {children}
        </Animated.View>
        <ReplyIndicator progress={progress} side="right" translateX={translateX} />
      </View>
    </GestureDetector>
  );
}

export function SwipeableMessageLeft({ children, onSwipe }) {
  const translateX = useSharedValue(0);
  const progress = useSharedValue(0);
  const [bubbleHeight, setBubbleHeight] = useState(40);

  const gesture = Gesture.Pan()
    .activeOffsetX([-15, -15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX * 0.4, -THRESHOLD * 0.7);
        progress.value = Math.min(Math.abs(e.translationX) / THRESHOLD, 1);
      }
    })
    .onEnd((e) => {
      if (e.translationX < -THRESHOLD) runOnJS(onSwipe)();
      translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
      progress.value = withTiming(0, { duration: 250 });
    })
    .onFinalize(() => {
      translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
      progress.value = withTiming(0, { duration: 250 });
    });

  const messageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ alignSelf: 'flex-end' }}>
        <Animated.View
          style={messageStyle}
          onLayout={(e) => setBubbleHeight(e.nativeEvent.layout.height)}
        >
          {children}
        </Animated.View>
        <ReplyIndicator progress={progress} side="left" translateX={translateX} bubbleHeight={bubbleHeight} />
      </View>
    </GestureDetector>
  );
}
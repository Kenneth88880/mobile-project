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
  useAnimatedProps
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RADIUS = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const THRESHOLD = 60;
const SIZE = 30;
const BORDER = 3;
const GAP = 1;

function ArcRing({ progress }) {
  const animatedProps = useAnimatedProps(() => {
    const p = Math.min(Math.abs(progress.value), 1);
    return {
      strokeDashoffset: CIRCUMFERENCE * (1 - p),
    };
  });

  return (
    <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
      {/* Background track */}
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke="rgba(136,136,136,0.18)"
        strokeWidth={BORDER}
        fill="none"
      />
      {/* Animated fill */}
      <AnimatedCircle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke="#5B8BF5"
        strokeWidth={BORDER}
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        animatedProps={animatedProps}
        strokeLinecap="round"
        rotation="-90"
        origin={`${SIZE / 2}, ${SIZE / 2}`}
      />
    </Svg>
  );
}

function ReplyIndicator({ progress, side, translateX }) {
  const APPEAR_THRESHOLD = 15 / THRESHOLD;

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

export function SwipeableMessageRight({ children, onSwipe, onMessageSwipeStart, onMessageSwipeEnd }) {
  const translateX = useSharedValue(0);
  const progress = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activeOffsetX([10, 999])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      if (onMessageSwipeStart) runOnJS(onMessageSwipeStart)();
    })
    .onUpdate((e) => {
      if (e.translationX > 0) {
        translateX.value = Math.min(e.translationX * 0.4, THRESHOLD * 0.4);
        progress.value = Math.min(e.translationX / THRESHOLD, 1);
      }
    })
    .onEnd((e) => {
      if (onMessageSwipeEnd) runOnJS(onMessageSwipeEnd)();
      if (e.translationX > THRESHOLD) runOnJS(onSwipe)();
      translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
      progress.value = withTiming(0, { duration: 250 });
    })
    .onFinalize(() => {
      if (onMessageSwipeEnd) runOnJS(onMessageSwipeEnd)();
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

export function SwipeableMessageLeft({ children, onSwipe, onMessageSwipeStart, onMessageSwipeEnd }) {
  const translateX = useSharedValue(0);
  const progress = useSharedValue(0);
  const [bubbleHeight, setBubbleHeight] = useState(40);

  const gesture = Gesture.Pan()
    .activeOffsetX([-15, -15])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      if (onMessageSwipeStart) runOnJS(onMessageSwipeStart)();
    
    })
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX * 0.4, -THRESHOLD * 0.4);
        progress.value = Math.min(Math.abs(e.translationX) / THRESHOLD, 1);
      }
    })
    .onEnd((e) => {
      if (onMessageSwipeEnd) runOnJS(onMessageSwipeEnd)();
      if (e.translationX < -THRESHOLD) runOnJS(onSwipe)();
      translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
      progress.value = withTiming(0, { duration: 250 });
    })
    .onFinalize(() => {
      if (onMessageSwipeEnd) runOnJS(onMessageSwipeEnd)();
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
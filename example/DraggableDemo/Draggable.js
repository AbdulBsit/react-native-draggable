/**
 *	* https://github.com/tongyy/react-native-draggable
 *
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';

function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

function isDragging(gs) {
  return Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2;
}

export default function Draggable(props) {
  const {
    renderText,
    isCircle,
    renderSize,
    imageSource,
    renderColor,
    children,
    shouldReverse,
    disabled,
    onDrag,
    onShortPressRelease,
    onDragRelease,
    onLongPress,
    onPressIn,
    onPressOut,
    x,
    y,
    z,
    minX,
    minY,
    maxX,
    maxY,
  } = props;

  // The Animated object housing our xy value so that we can spring back
  const pan = React.useRef(new Animated.ValueXY());
  // Always set to xy value of pan, would like to remove
  const offsetFromStart = React.useRef({x: 0, y: 0});
  // Width/Height of Draggable (renderSize is arbitrary if children are passed in)
  const childSize = React.useRef({x: renderSize, y: renderSize});
  // Top/Left/Right/Bottom location on screen from start of most recent touch
  const startBounds = React.useRef();

  const getBounds = React.useCallback(() => {
    const left = x + offsetFromStart.current.x;
    const top = y + offsetFromStart.current.y;
    return {
      left,
      top,
      right: left + childSize.current.x,
      bottom: top + childSize.current.y,
    };
  }, [x, y]);

  const reversePosition = React.useCallback(() => {
    Animated.spring(pan.current, {toValue: {x: 0, y: 0}}).start();
  }, [pan]);

  const onPanResponderRelease = React.useCallback(
    (e, gestureState) => {
      if (onDragRelease) {
        onDragRelease(e, gestureState);
      }
      if (!shouldReverse) {
        pan.current.flattenOffset();
      } else {
        reversePosition();
      }
    },
    [onDragRelease, shouldReverse, reversePosition],
  );

  const onPanResponderGrant = React.useCallback(
    (e, gestureState) => {
      startBounds.current = getBounds();
      if (!shouldReverse) {
        pan.current.setOffset(offsetFromStart.current);
        pan.current.setValue({x: 0, y: 0});
      }
    },
    [getBounds, shouldReverse],
  );

  const handleOnDrag = React.useCallback(
    (e, gestureState) => {
      const {dx, dy} = gestureState;
      const {top, right, left, bottom} = startBounds.current;
      const far = 999999999;
      const changeX = clamp(
        dx,
        Number.isFinite(minX) ? minX - left : -far,
        Number.isFinite(maxX) ? maxX - right : far,
      );
      const changeY = clamp(
        dy,
        Number.isFinite(minY) ? minY - top : -far,
        Number.isFinite(maxY) ? maxY - bottom : far,
      );
      pan.current.setValue({x: changeX, y: changeY});
      onDrag && onDrag(e, gestureState);
    },
    [maxX, maxY, minX, minY, onDrag],
  );

  const panResponder = React.useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabled && isDragging(gestureState),
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        !disabled && isDragging(gestureState),
      onPanResponderGrant,
      onPanResponderMove: Animated.event([], {listener: handleOnDrag}),
      onPanResponderRelease,
    });
  }, [disabled, handleOnDrag, onPanResponderGrant, onPanResponderRelease]);

  // TODO Figure out a way to destroy and remove offsetFromStart entirely
  React.useEffect(() => {
    const curPan = pan.current; // Using an instance to avoid losing the pointer before the cleanup
    if (!shouldReverse) {
      curPan.addListener(c => (offsetFromStart.current = c));
    }
    return () => {
      curPan.removeAllListeners();
    };
  }, [shouldReverse]);

  const positionCss = React.useMemo(() => {
    const Window = Dimensions.get('window');
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      width: Window.width,
      height: Window.height,
    };
  }, []);

  const dragItemCss = React.useMemo(() => {
    const style = {
      top: y,
      left: x,
      elevation: z,
      z,
    };
    if (renderColor) {
      style.backgroundColor = renderColor;
    }
    if (isCircle) {
      style.borderRadius = renderSize;
    }

    if (children) {
      return {
        ...style,
        alignSelf: 'baseline',
      };
    }
    return {
      ...style,
      justifyContent: 'center',
      width: renderSize,
      height: renderSize,
    };
  }, [children, isCircle, renderColor, renderSize, x, y, z]);

  const touchableContent = React.useMemo(() => {
    if (children) {
      return children;
    } else if (imageSource) {
      return (
        <Image
          style={{width: renderSize, height: renderSize}}
          source={imageSource}
        />
      );
    } else {
      return <Text style={styles.text}>{renderText}</Text>;
    }
  }, [children, imageSource, renderSize, renderText]);

  const handleOnLayout = React.useCallback(event => {
    const {height, width} = event.nativeEvent.layout;
    childSize.current = {x: width, y: height};
  }, []);

  return (
    <View pointerEvents="box-none" style={positionCss}>
      <Animated.View
        {...panResponder.panHandlers}
        style={pan.current.getLayout()}>
        <TouchableOpacity
          onLayout={handleOnLayout}
          style={dragItemCss}
          disabled={disabled}
          onPress={onShortPressRelease}
          onLongPress={onLongPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}>
          {touchableContent}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

/***** Default props and types */

Draggable.defaultProps = {
  renderColor: 'yellowgreen',
  renderText: '＋',
  renderSize: 36,
  shouldReverse: false,
  x: 0,
  y: 0,
  z: 1,
  disabled: false,
};

Draggable.propTypes = {
  /**** props that should probably be removed in favor of "children" */
  renderText: PropTypes.string,
  isCircle: PropTypes.bool,
  renderSize: PropTypes.number,
  imageSource: PropTypes.number,
  renderColor: PropTypes.string,
  /**** */
  children: PropTypes.element,
  shouldReverse: PropTypes.bool,
  disabled: PropTypes.bool,
  onDrag: PropTypes.func,
  onShortPressRelease: PropTypes.func,
  onDragRelease: PropTypes.func,
  onLongPress: PropTypes.func,
  onPressIn: PropTypes.func,
  onPressOut: PropTypes.func,
  x: PropTypes.number,
  y: PropTypes.number,
  // z/elevation should be removed because it doesn't sync up visually and haptically
  z: PropTypes.number,
  minX: PropTypes.number,
  minY: PropTypes.number,
  maxX: PropTypes.number,
  maxY: PropTypes.number,
};

const styles = StyleSheet.create({
  text: {color: '#fff', textAlign: 'center'},
});

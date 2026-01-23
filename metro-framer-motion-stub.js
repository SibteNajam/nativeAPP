// Comprehensive stub file for framer-motion on web
// This provides all the functions that moti needs to work on web

import React from 'react';

// Motion components stub
export const motion = new Proxy({}, {
    get: (target, prop) => {
        return React.forwardRef((props, ref) => {
            const { children, ...rest } = props;
            return React.createElement(prop, { ...rest, ref }, children);
        });
    }
});

// AnimatePresence - renders children directly
export const AnimatePresence = ({ children, exitBeforeEnter, onExitComplete, ...props }) => {
    return React.createElement(React.Fragment, null, children);
};

// usePresence - critical for moti
export const usePresence = () => {
    return [true, () => { }]; // [isPresent, safeToRemove]
};

// useIsPresent
export const useIsPresent = () => true;

// Animation hooks
export const useAnimation = () => ({
    start: () => Promise.resolve(),
    stop: () => { },
    set: () => { },
});

export const useMotionValue = (initial = 0) => ({
    get: () => initial,
    set: () => { },
    onChange: () => () => { },
    isAnimating: () => false,
    stop: () => { },
    velocity: 0,
    current: initial,
});

export const useTransform = (value, input, output) => ({
    get: () => (output ? output[0] : 0),
    set: () => { },
    onChange: () => () => { },
});

export const useSpring = (value, config) => ({
    get: () => (typeof value === 'number' ? value : 0),
    set: () => { },
    onChange: () => () => { },
});

export const useVelocity = () => useMotionValue(0);

export const useScroll = () => ({
    scrollX: useMotionValue(0),
    scrollY: useMotionValue(0),
    scrollXProgress: useMotionValue(0),
    scrollYProgress: useMotionValue(0),
});

export const useViewportScroll = useScroll;

// Cycle
export const useCycle = (...items) => {
    const [index, setIndex] = React.useState(0);
    return [
        items[index],
        () => setIndex((i) => (i + 1) % items.length),
    ];
};

// Drag controls
export const useDragControls = () => ({
    start: () => { },
});

// Reduced motion
export const useReducedMotion = () => false;

// MotionConfig
export const MotionConfig = ({ children }) => children;

// LazyMotion and domAnimation
export const LazyMotion = ({ children }) => children;
export const domAnimation = {};
export const domMax = {};

// m - minimal motion component
export const m = motion;

// Reorder
export const Reorder = {
    Group: ({ children, ...props }) => React.createElement('div', props, children),
    Item: ({ children, ...props }) => React.createElement('div', props, children),
};

// Frame (legacy)
export const Frame = motion.div;

// Default export
export default {
    motion,
    AnimatePresence,
    usePresence,
    useIsPresent,
    useAnimation,
    useMotionValue,
    useTransform,
    useSpring,
    useVelocity,
    useScroll,
    useViewportScroll,
    useCycle,
    useDragControls,
    useReducedMotion,
    MotionConfig,
    LazyMotion,
    domAnimation,
    domMax,
    m,
    Reorder,
    Frame,
};

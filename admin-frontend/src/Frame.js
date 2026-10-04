import React, { useEffect } from 'react';

const ResponsiveFrame = () => {
    const [frameStyle, setFrameStyle] = React.useState({
        width: '1440px',
        height: '1024px',
        backgroundColor: '#6d6d6d',
    });

    useEffect(() => {
        const adjustFrameSize = () => {
            const frame = document.querySelector('.frame');
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (viewportWidth > 1440) {
                frame.style.width = '100vw';
                frame.style.height = 'auto';
            } else {
                frame.style.width = '1440px';
                frame.style.height = '1024px';
            }
        };

        window.addEventListener('resize', adjustFrameSize);
        adjustFrameSize();

        return () => {
            window.removeEventListener('resize', adjustFrameSize);
        };
    }, []);

    return (
        <div className="frame" style={frameStyle}>
            {/* Your content goes here */}
        </div>
    );
};

export default ResponsiveFrame;
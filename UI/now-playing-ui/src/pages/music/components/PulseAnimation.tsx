export function PulseAnimation() {
    return (
        <style>
            {`
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.3; transform: scale(1.1); }
                }
            `}
        </style>
    );
}

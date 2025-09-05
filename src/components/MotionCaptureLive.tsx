import './MotionCapture.css'

export default function MotionCaptureLive({onGoHome} : {onGoHome: () => void}) {
    return (
        <div id="container">
            Live Capture View
            <button onClick={onGoHome}> Go Home </button>
        </div>
    )
}
import "./MotionCapture.css"

export default function MotionCaptureProcess({onGoHome} : {onGoHome: () => void}) {
    return (
        <div id="container">
            Process View
            <button onClick={onGoHome}> Go Home </button>
        </div>
    )
}
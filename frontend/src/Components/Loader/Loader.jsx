import React from 'react'
import './loader.css';

const Loader = () => {
    return (
        <div className="mri-loader-container">
            <div className="mri-loader">
                <div className="mri-scan"></div>
            </div>
            <p className="mri-text">Scanning...</p>
        </div>
    )
}

export default Loader
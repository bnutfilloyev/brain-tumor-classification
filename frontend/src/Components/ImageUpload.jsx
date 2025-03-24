import React, { useState } from 'react';
import styled from 'styled-components';
import ReactImageFileToBase64 from "react-file-image-to-base64";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const Container = styled.div`
    width: 450px;
    height: 350px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 16px;
    align-items: center;
    background: ${({ theme }) => theme.card};
    border: 3px solid ${({ theme }) => theme.primary};
    border-radius: 20px;
    color: ${({ theme }) => theme.text};
    padding: 24px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
    transition: transform 0.3s ease-in-out;

    &:hover {
        transform: scale(1.05);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    }
`;


const Typo = styled.div`
    font-size: 22px;
    font-weight: 700;
`;


const TextBtn = styled.div`
    font-size: 18px;
    font-weight: 600;
    color: ${({ theme }) => theme.primary};
    cursor: pointer;
    padding: 12px 24px;
    background: ${({ theme }) => theme.bgLighter};
    border: 2px solid ${({ theme }) => theme.primary};
    border-radius: 24px;
    transition: background 0.3s ease-in-out, transform 0.2s ease-in-out;

    &:hover {
        background: ${({ theme }) => theme.primary};
        color: ${({ theme }) => theme.text};
        transform: scale(1.05);
    }
`;


const IconWrapper = styled.div`
    background: rgba(76, 175, 80, 0.15);
    border-radius: 50%;
    padding: 30px;
    display: flex;
    justify-content: center;
    align-items: center;

    svg {
        font-size: 120px;
        color: ${({ theme }) => theme.primary};
    }
`;

const ImageUpload = ({ images, setImages }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        const base64Promises = droppedFiles.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve({
                    file_name: file.name,
                    base64_file: reader.result
                });
                reader.onerror = error => reject(error);
            });
        });

        Promise.all(base64Promises).then(files => setImages(files));
    };

    const handleOnCompleted = files => {
        setImages(files);
    };

    const CustomisedButton = ({ triggerInput }) => {
        return (
            <TextBtn onClick={triggerInput}>
                Browse Image
            </TextBtn>
        );
    };

    return (
        <Container
            className={isDragging ? 'dragging' : ''}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            <IconWrapper>
                <CloudUploadIcon />
            </IconWrapper>
            <Typo>Drag & Drop Image(s) here</Typo>
            <div style={{ display: "flex", gap: '6px' }}>
                <Typo>or</Typo>
                <ReactImageFileToBase64
                    onCompleted={handleOnCompleted}
                    CustomisedButton={CustomisedButton}
                    multiple={true}
                />
            </div>
        </Container>
    )
}

export default ImageUpload
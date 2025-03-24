import React from 'react';
import { ThemeProvider } from "styled-components";
import { useState } from "react";
import { darkTheme, lightTheme } from "./utils/themes";
import styled from 'styled-components';
import ImageUpload from "./Components/ImageUpload";
import Loader from "./Components/Loader/Loader";
import ResultCard from "./Components/ResultCard";
import generatePrediction from "./utils/prediction";


const FlexItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const Typo = styled.div`
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 16px;
`;


const ResultWrapper = styled.div`
    display: flex;
    flex-direction: column; /* Ustun shaklida chiqishi uchun */
    gap: 20px;
    width: 100%;
`;

const Body = styled.div`
    display: flex; 
    align-items: center;
    flex-direction: column;
    width: 100vw;
    min-height: 100vh;
    background: ${({ theme }) => theme.bg};
    color: ${({ theme }) => theme.text};
    overflow-y: scroll;
`;

const Heading = styled.div`
    font-size: 42px;
    @media (max-width: 530px) {
        font-size: 28px;
    }
    font-weight: 700;
    text-transform: uppercase;
    background: -webkit-linear-gradient(135deg, ${({ theme }) => theme.primary}, ${({ theme }) => theme.secondary});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 3% 0px;
    text-align: center;
`;

const ThemeSwitch = styled.div`
    position: absolute;
    top: 20px;
    right: 20px;
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.text};
    padding: 8px 14px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

    &:hover {
        background: ${({ theme }) => theme.secondary};
        color: #FFFFFF;
    }
`;

const Container = styled.div`
    max-width: 100%;
    display: flex; 
    justify-content: center;
    flex-direction: row;
    @media (max-width: 1100px) {
        flex-direction: column;
    }
    gap: 40px;
    padding: 4% 0% 8% 0%;
`;

const Button = styled.div`
    min-height: 44px;
    border-radius: 20px;
    background: ${({ theme }) => theme.primary};
    color: #fff;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.5);
    margin: 10px 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px 24px;
    cursor: pointer;
    transition: all 0.3s ease-in-out;

    &:hover {
        background: ${({ theme }) => theme.secondary};
        box-shadow: 0 6px 15px rgba(76, 175, 80, 0.8);
    }

    &:active {
        transform: scale(0.98);
    }
`;

function App() {
    const [theme, setTheme] = useState('dark');
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const [images, setImages] = useState(null);
    const [predictedImage, setPredictedImage] = useState(null);
    const [predictions, setPredictions] = useState();
    const [loading, setLoading] = useState(false);
    const [showPrediction, setShowPrediction] = useState(false);


    return (
        <ThemeProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
            <Body>
                <ThemeSwitch onClick={toggleTheme}>
                    {theme === 'dark' ? "🌞 Light Mode" : "🌙 Dark Mode"}
                </ThemeSwitch>

                <Heading>Brain Tumor Detector 🧠</Heading>

                {loading ?
                    <Loader />
                    :
                <Container>
                    <FlexItem>
                        <ImageUpload images={images} setImages={setImages} />
                        {images && (
                        <Button onClick={ async () => {
                            setLoading(true);
                            const res = await generatePrediction(images);
                            setPredictedImage(images);
                            setPredictions(res);
                            setShowPrediction(true);
                            setLoading(false);
                        }}>
                                PREDICT
                        </Button>
                        )}
                    </FlexItem>

                    {showPrediction && (
                        <ResultWrapper>
                            {predictedImage.map((image, index) => {
                                const detection = predictions[index]?.detections?.[0];
                                return (
                                    <ResultCard
                                        key={index}
                                        image={image}
                                        classId={detection.classId}
                                        confidence={detection.confidence}
                                    />
                                );
                            })}
                        </ResultWrapper>
                    )}
                </Container>
                }
            </Body>
        </ThemeProvider>
    );
}

export default App;
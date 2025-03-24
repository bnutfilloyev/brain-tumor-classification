import React from 'react'
import styled from 'styled-components';
import { MdErrorOutline, MdCheckCircle } from 'react-icons/md';
const classMappings = { 0: 'Glioma', 1: 'Meninigioma', 2: 'Notumor', 3: 'Pituitary' };

const Container = styled.div`
    background-color: ${({ classId }) => classId === 2 ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'};
    border: 3px solid ${({ classId }) => classId === 2 ? 'green' : 'red'};
    border-radius: 16px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    cursor: pointer;
    transition: all 0.3s ease-in-out;

    &:hover {
        transform: scale(1.05);
    }
`;

const Image = styled.img`
    height: 100%;
    width: 160px;
    object-fit: cover;
    border-radius: 16px;
    border: 3px solid ${({ theme }) => theme.primary};
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
`;

const TitleWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const Title = styled.div`
    font-size: 26px;
    font-weight: 800;
    text-transform: uppercase;
    ${({ prediction }) => prediction ? `color: red` : `color: green`};
`;

const Description = styled.div`
    font-size: 16px;
    font-weight: 400;
    color: ${({ theme }) => theme.textSoft};
`;

const File = styled.div`
    font-size: 14px;
    font-weight: 400;
    color: ${({ theme }) => theme.text};
`;

const Probability = styled.div`
    font-size: 18px;
    font-weight: 600;
    color: ${({ prediction }) => prediction ? 'red' : 'green'};
`;

const ProgressBar = styled.div`
    width: 100%;
    height: 10px;
    background-color: #ddd;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
`;

const ProgressFill = styled.div`
    height: 100%;
    width: ${({ probability }) => probability}%;
    background-color: ${({ prediction }) => prediction ? 'red' : 'green'};
    transition: width 0.3s ease-in-out;
`;

const ResultCard = ({ image, classId, confidence }) => {
    const className = classMappings[classId] || 'Unknown';
    const isTumorDetected = classId !== 2 && classId !== undefined && classId !== null;

    return (
        <Container classId={classId}>
            <Image src={image.base64_file} alt="image" />
            <Body>
                <TitleWrapper>
                    {!isTumorDetected 
                        ? <MdCheckCircle size={28} color="green" /> 
                        : <MdErrorOutline size={28} color="red" />}
                    <Title prediction={!isTumorDetected}>
                        {!isTumorDetected ? "No Tumor Detected" : className}
                    </Title>
                </TitleWrapper>

                <Description>
                    {classId === 0 && "According to our prediction, this appears to be a Glioma tumor type, which may require further analysis."}
                    {classId === 1 && "According to our prediction, this appears to be a Meninigioma tumor type, which may require further analysis."}
                    {classId === 3 && "According to our prediction, this appears to be a Pituitary tumor type, which may require further analysis."}
                    {classId === 2 && "According to our prediction, no tumor was detected in the image."}
                </Description>

                <File>File: {image.file_name}</File>

                <Probability prediction={isTumorDetected}>
                    Score: {confidence ? confidence.toFixed(2) : 'N/A'}%
                </Probability>

                <ProgressBar>
                    <ProgressFill prediction={isTumorDetected} probability={confidence ? confidence : 0} />
                </ProgressBar>
            </Body>
        </Container>
    )
}

export default ResultCard;
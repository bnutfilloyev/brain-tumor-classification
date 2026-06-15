"""Claude API wrapper for clinical summaries and Q&A chat.

Falls back to a deterministic informational message when no API key is set,
so the demo works offline.
"""
import os
import logging

logger = logging.getLogger("tumor_detector")

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
MAX_TOKENS = 1024

DISCLAIMER = {
    "en": "\n\n_Note: This is AI-generated educational information, not a medical diagnosis. Clinical correlation and specialist review are required._",
    "uz": "\n\n_Eslatma: Bu sun'iy intellekt tomonidan yaratilgan ma'lumot, tibbiy tashxis emas. Mutaxassis ko'rigi va qo'shimcha tekshiruv zarur._",
}

TUMOR_INFO = {
    "Glioma": {
        "en": "Glioma is a tumor that arises from glial cells in the brain or spine. Gliomas vary widely in aggressiveness (WHO grade I–IV). Common symptoms include headaches, seizures, and focal neurological deficits. Management typically involves MRI characterization, surgical resection where feasible, and adjuvant radiotherapy/chemotherapy depending on grade.",
        "uz": "Glioma — bosh miya yoki orqa miyadagi glial hujayralardan kelib chiqadigan o'simta. Agressivligi turlicha (WHO I–IV daraja). Belgilari: bosh og'rig'i, tutqanoq, neurologik buzilishlar. Davolash: MRT bilan aniqlash, imkon bo'lsa jarrohlik, daraja bo'yicha nur/kimyoterapiya.",
    },
    "Meningioma": {
        "en": "Meningioma originates from the meninges surrounding the brain and spinal cord. Most are benign and slow-growing. Many are found incidentally. Treatment ranges from observation for small asymptomatic lesions to surgical removal or radiosurgery for symptomatic or growing tumors.",
        "uz": "Meningioma — miya va orqa miyani o'rab turuvchi pardalardan kelib chiqadi. Ko'pchiligi xavfsiz va sekin o'sadi. Davolash: kichik belgisizlarni kuzatish, belgili yoki o'suvchilarni jarrohlik yoki radioxirurgiya.",
    },
    "Pituitary": {
        "en": "Pituitary tumors (adenomas) develop in the pituitary gland. They may be hormone-secreting or non-functioning and can cause endocrine disturbances or visual field defects via optic chiasm compression. Management includes endocrine evaluation, medical therapy, or transsphenoidal surgery.",
        "uz": "Gipofiz o'simtasi (adenoma) gipofiz bezida rivojlanadi. Gormon ishlab chiqaruvchi yoki nofaol bo'lishi mumkin; ko'rish maydoni buzilishi va endokrin o'zgarishlarga olib keladi. Davolash: endokrin baholash, dori yoki transsfenoidal jarrohlik.",
    },
    "Notumor": {
        "en": "The model did not detect features consistent with a tumor in this scan. This does not rule out pathology; clinical judgment and follow-up imaging remain important where symptoms persist.",
        "uz": "Model ushbu tasvirda o'simtaga mos belgilarni aniqlamadi. Bu patologiyani to'liq inkor etmaydi; belgilar davom etsa, klinik baho va takroriy tekshiruv muhim.",
    },
}


def _get_client():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic

        return anthropic.Anthropic(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to init Anthropic client: {e}")
        return None


def _fallback_summary(class_name, confidence, language):
    lang = language if language in ("en", "uz") else "en"
    info = TUMOR_INFO.get(class_name, {}).get(lang, "")
    if lang == "uz":
        header = f"**Natija: {class_name}** (ishonch darajasi {confidence:.1f}%)\n\n"
    else:
        header = f"**Result: {class_name}** (confidence {confidence:.1f}%)\n\n"
    return header + info + DISCLAIMER[lang]


def generate_summary(class_name, confidence, language="en", patient_context=None):
    client = _get_client()
    lang = language if language in ("en", "uz") else "en"
    if client is None:
        return _fallback_summary(class_name, confidence, language), MODEL, True

    lang_name = "Uzbek" if lang == "uz" else "English"
    ctx = f"\nPatient context: {patient_context}" if patient_context else ""
    system = (
        "You are a clinical decision-support assistant for radiologists. "
        "Provide concise, accurate, educational summaries about brain MRI findings. "
        "Always include a disclaimer that this is not a diagnosis. "
        f"Respond in {lang_name}."
    )
    prompt = (
        f"An MRI brain scan classification model predicted: {class_name} "
        f"with {confidence:.1f}% confidence.{ctx}\n\n"
        "Write a short clinical summary (4-6 sentences) covering: what this finding means, "
        "typical clinical relevance, and recommended next steps. Use markdown."
    )
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in msg.content if b.type == "text")
        return text + DISCLAIMER[lang], MODEL, False
    except Exception as e:
        logger.error(f"Claude summary failed: {e}")
        return _fallback_summary(class_name, confidence, language), MODEL, True


def _summary_prompt(class_name, confidence, language, patient_context):
    lang = language if language in ("en", "uz") else "en"
    lang_name = "Uzbek" if lang == "uz" else "English"
    ctx = f"\nPatient context: {patient_context}" if patient_context else ""
    system = (
        "You are a clinical decision-support assistant for radiologists. "
        "Provide concise, accurate, educational summaries about brain MRI findings. "
        "Always include a disclaimer that this is not a diagnosis. "
        f"Respond in {lang_name}."
    )
    prompt = (
        f"An MRI brain scan classification model predicted: {class_name} "
        f"with {confidence:.1f}% confidence.{ctx}\n\n"
        "Write a short clinical summary (4-6 sentences) covering: what this finding means, "
        "typical clinical relevance, and recommended next steps. Use markdown."
    )
    return system, prompt


def _chat_system(class_name, confidence, language):
    lang = language if language in ("en", "uz") else "en"
    lang_name = "Uzbek" if lang == "uz" else "English"
    ctx = ""
    if class_name:
        ctx = f" The current scan was classified as {class_name}"
        if confidence:
            ctx += f" ({confidence:.1f}% confidence)"
        ctx += "."
    return (
        "You are a knowledgeable, careful clinical assistant answering questions about "
        f"brain tumors and MRI findings for medical professionals.{ctx} "
        "Be accurate and concise. Never give a definitive diagnosis. "
        f"Respond in {lang_name}."
    )


def stream_summary(class_name, confidence, language="en", patient_context=None):
    """Yield text chunks for a streaming clinical summary."""
    client = _get_client()
    lang = language if language in ("en", "uz") else "en"
    if client is None:
        yield _fallback_summary(class_name, confidence, language)
        return
    system, prompt = _summary_prompt(class_name, confidence, language, patient_context)
    try:
        with client.messages.stream(
            model=MODEL, max_tokens=MAX_TOKENS, system=system,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text
        yield DISCLAIMER[lang]
    except Exception as e:
        logger.error(f"Claude stream summary failed: {e}")
        yield _fallback_summary(class_name, confidence, language)


def stream_chat(messages, class_name=None, confidence=None, language="en"):
    """Yield text chunks for a streaming chat reply."""
    client = _get_client()
    lang = language if language in ("en", "uz") else "en"
    if client is None:
        reply, _, _ = chat(messages, class_name, confidence, language)
        yield reply
        return
    system = _chat_system(class_name, confidence, language)
    api_messages = [{"role": m.role, "content": m.content} for m in messages]
    try:
        with client.messages.stream(
            model=MODEL, max_tokens=MAX_TOKENS, system=system, messages=api_messages,
        ) as stream:
            for text in stream.text_stream:
                yield text
    except Exception as e:
        logger.error(f"Claude stream chat failed: {e}")
        reply, _, _ = chat(messages, class_name, confidence, language)
        yield reply


def chat(messages, class_name=None, confidence=None, language="en"):
    client = _get_client()
    lang = language if language in ("en", "uz") else "en"
    if client is None:
        last = messages[-1].content if messages else ""
        info = TUMOR_INFO.get(class_name, {}).get(lang, "") if class_name else ""
        reply = (info or last) + DISCLAIMER[lang]
        return reply, MODEL, True

    lang_name = "Uzbek" if lang == "uz" else "English"
    ctx = ""
    if class_name:
        ctx = f" The current scan was classified as {class_name}"
        if confidence:
            ctx += f" ({confidence:.1f}% confidence)"
        ctx += "."
    system = (
        "You are a knowledgeable, careful clinical assistant answering questions about "
        f"brain tumors and MRI findings for medical professionals.{ctx} "
        "Be accurate and concise. Never give a definitive diagnosis. "
        f"Respond in {lang_name}."
    )
    api_messages = [{"role": m.role, "content": m.content} for m in messages]
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=api_messages,
        )
        text = "".join(b.text for b in msg.content if b.type == "text")
        return text, MODEL, False
    except Exception as e:
        logger.error(f"Claude chat failed: {e}")
        return _fallback_summary(class_name or "Notumor", confidence or 0, language), MODEL, True

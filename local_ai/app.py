from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import re
import json

app = FastAPI(title="Local AI Review Service")


class Article(BaseModel):
    title: str
    content: str
    article_type: Optional[str] = "reporting"
    disclosure: Optional[str] = ""


@app.on_event("startup")
def load_model():
    global pipe
    try:
        from transformers import pipeline
        pipe = pipeline("text2text-generation", model="google/flan-t5-small")
        print("Local AI: loaded google/flan-t5-small pipeline")
    except Exception as e:
        print("Local AI: failed to load model", e)
        pipe = None


def local_heuristic(article: Article):
    text = f"{article.title}\n{article.content}".lower()
    reject_patterns = [r"\bkill\b", r"\bbomb\b", r"\bshoot\b", r"\bkill the\b"]
    for p in reject_patterns:
        if re.search(p, text):
            return {"decision": "rejected", "feedback": "Content contains violent or clearly harmful language."}

    hateful = [r"\b(nigger|faggot|slur1)\b"]
    for p in hateful:
        if re.search(p, text):
            return {"decision": "rejected", "feedback": "Content contains hate speech and cannot be published."}

    if article.article_type == 'reporting' and (not article.disclosure or not article.disclosure.strip()):
        return {"decision": "needs_revision", "feedback": "Reporting articles require a disclosure describing sources or how the author knows this information."}

    if not article.content or len(article.content.strip()) < 200:
        return {"decision": "needs_revision", "feedback": "Article is too short; add more detail and clear structure."}

    return {"decision": "approved", "feedback": "Article passes basic heuristic checks."}


@app.post("/review")
def review(article: Article):
    prompt = f"""You are a standards verifier for a youth-run journalism platform.

You are NOT a journalist, editor, or fact checker.
You do NOT judge truth or accuracy.
You do NOT rewrite content or add facts.

Your job is ONLY to verify whether a submitted article meets basic publication standards.

Check for:
1. Clear structure (readable paragraphs, coherent flow)
2. Clear disclosure of how the author knows this information
3. Calm, non-inciting, non-hateful tone
4. Appropriate classification as reporting or perspective

If claims cannot be verified, require the author to label them clearly as personal experience or uncertainty.

Article Details:
Title: {article.title}
Type: {article.article_type}
Content: {article.content}
Disclosure: {article.disclosure}

IMPORTANT: Respond with ONLY valid JSON and NOTHING else. The JSON must be exactly:
{{
  "decision": "approved" | "needs_revision" | "rejected",
  "feedback": "Clear, kind, specific feedback for the author"
}}

If you are unsure, choose \"needs_revision\". Output only the JSON object and nothing else."""

    raw = ''
    if pipe is not None:
        try:
            out = pipe(prompt, max_new_tokens=300, do_sample=False)
            if isinstance(out, list) and len(out) > 0:
                raw = out[0].get('generated_text') if isinstance(out[0], dict) else str(out[0])
            else:
                raw = str(out)
        except Exception as e:
            raw = f"PIPE_ERROR: {e}"

    # Try to extract JSON from model output
    if raw:
        m = re.search(r"\{[\s\S]*\}", raw)
        if m:
            json_text = m.group(0)
            try:
                parsed = json.loads(json_text)
                if parsed.get('decision') and parsed.get('feedback'):
                    return {"decision": parsed['decision'], "feedback": parsed['feedback'], "raw": raw}
            except Exception:
                pass

    # Fallback to deterministic heuristic
    fallback = local_heuristic(article)
    return {"decision": fallback['decision'], "feedback": fallback['feedback'] + ' (review performed by local fallback)', "raw": raw}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('local_ai.app:app', host='127.0.0.1', port=8000, log_level='info')

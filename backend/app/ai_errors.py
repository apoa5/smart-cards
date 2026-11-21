class GenerationError(Exception):
    def __init__(self, code, message, status=502):
        super().__init__(message)
        self.code = code
        self.status = status


def generation_error(error):
    status = getattr(error, "status_code", None)
    code = getattr(error, "code", None)
    if isinstance(error, GenerationError):
        return error
    if status == 401:
        return GenerationError("invalid_api_key", "The server's OpenAI API key is invalid. Update OPENAI_API_KEY in the backend deployment.")
    if code == "insufficient_quota":
        return GenerationError("insufficient_quota", "The OpenAI project has insufficient API quota. Check its billing and usage limits.")
    if status == 429:
        return GenerationError("rate_limited", "The AI service is busy. Please wait a moment and try again.", 429)
    if status in (403, 404):
        return GenerationError("model_access", "The server cannot access the configured AI model. Check the API project's model permissions.")
    if isinstance(error, TimeoutError):
        return GenerationError("ai_timeout", "AI generation timed out. Please try again with fewer items.", 504)
    if isinstance(error, ValueError):
        return GenerationError("invalid_ai_response", "The AI returned an incomplete or invalid response. Try again with fewer items.")
    return GenerationError("ai_unavailable", "The AI service could not complete generation. Please try again.")

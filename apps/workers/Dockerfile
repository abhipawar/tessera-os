# Use an official lightweight Python image
FROM python:3.11-slim

# Prevent Python from writing pyc files to disk and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# Copy the dependency files first (to leverage Docker cache)
COPY pyproject.toml poetry.lock* ./

# Configure Poetry to not use a virtual environment (since we are in a container)
# and install the dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# --- UPDATE THIS LINE ---
RUN pip install langgraph-checkpoint-postgres "psycopg[binary]" psycopg-pool

# Copy the rest of your worker code into the container
COPY . .

# Expose the port Uvicorn will run on
EXPOSE 8000

# Command to boot the FastAPI worker
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
# Life OS Backend

Flask API for Life OS modules.

## Run locally

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

API base URL: `http://localhost:5000/api`

## Endpoints

- `GET /api/health`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/<id>`
- `DELETE /api/tasks/<id>`

## Docker

```bash
docker build -t lifeos-api .
docker run --rm -p 5000:5000 lifeos-api
```

## Structure

```text
backend/
  app/
    __init__.py        # app factory
    db.py              # SQLAlchemy instance
    models/
      __init__.py
      task.py
    routes/
      __init__.py
      health.py
      tasks.py
  app.py               # local dev entrypoint
  wsgi.py              # gunicorn entrypoint
  config.py            # env-based config
  requirements.txt
  Dockerfile
```

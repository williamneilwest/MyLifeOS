from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import CommandSnippet, ToolLink


tools_bp = Blueprint('tools', __name__)


@tools_bp.get('/tools/', strict_slashes=False)
def get_tools_data():
    current_app.logger.info('[DB] Fetching table: tool_links')
    links = ToolLink.query.order_by(ToolLink.created_at.desc()).all()
    current_app.logger.info('[DB] Fetching table: command_snippets')
    snippets = CommandSnippet.query.order_by(CommandSnippet.created_at.desc()).all()

    return success_response({
        'links': [link.to_dict() for link in links],
        'snippets': [snippet.to_dict() for snippet in snippets],
    })


@tools_bp.post('/tools/', strict_slashes=False)
def create_tool_link():
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    url = str(data.get('url', '')).strip()

    if not name or not url:
        return error_response('name and url are required', 400)

    link = ToolLink(
        id=str(data.get('id') or '').strip() or None,
        name=name,
        url=url,
        category=str(data.get('category') or 'General'),
    )
    db.session.add(link)
    db.session.commit()

    return success_response(link.to_dict(), 201)

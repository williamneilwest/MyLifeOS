import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from flask import Blueprint, current_app, request

from ..auth import auth_required, get_current_user
from ..api_response import error_response, success_response
from ..db import db
from ..models import CommandSnippet, ToolLink, UserTool


tools_bp = Blueprint('tools', __name__)


def _is_supported_fetch_url(raw_url: str) -> bool:
    try:
        parsed = urlparse(raw_url)
    except Exception:
        return False
    return parsed.scheme in {'http', 'https'} and bool(parsed.netloc)


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
    current_app.logger.info('[TOOLS] create /tools payload=%s', data)

    # Compatibility path: allow module creation payloads on POST /api/tools.
    if data.get('type') is not None or data.get('config') is not None:
        name = str(data.get('name') or '').strip()
        tool_type = str(data.get('type') or '').strip()
        config = data.get('config') if isinstance(data.get('config'), dict) else {}
        if not name:
            return error_response('name is required', 400)
        if not tool_type:
            return error_response('type is required', 400)
        try:
            user = get_current_user()
        except RuntimeError:
            return error_response('Authentication required', 401)
        module = UserTool(user_id=user.id, name=name, type=tool_type, config_json=json.dumps(config))
        db.session.add(module)
        db.session.commit()
        current_app.logger.info('[TOOLS] created module (compat route) id=%s type=%s', module.id, module.type)
        return success_response(module.to_dict(), 201)

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


@tools_bp.route('/tools/fetch', methods=['GET', 'POST'], strict_slashes=False)
@auth_required
def proxy_fetch():
    method = str(request.args.get('method') or request.form.get('method') or 'GET').upper()
    if method not in {'GET', 'POST'}:
        return error_response('method must be GET or POST', 400)

    url = str(request.args.get('url') or request.form.get('url') or '').strip()
    if not url:
        return error_response('Missing URL', 400)
    if not _is_supported_fetch_url(url):
        return error_response('URL must be a valid http/https endpoint', 400)

    try:
        request_body = request.get_json(silent=True)
        payload_bytes = None
        if method == 'POST' and isinstance(request_body, dict):
            payload_bytes = json.dumps(request_body).encode('utf-8')

        outbound = Request(
            url=url,
            method=method,
            data=payload_bytes,
            headers={
                'Accept': 'application/json, text/plain;q=0.9, */*;q=0.8',
                'Content-Type': 'application/json',
                'User-Agent': 'myLifeOS-tools-proxy/1.0',
            },
        )

        with urlopen(outbound, timeout=10) as response:
            status = response.getcode()
            content_type = response.headers.get('Content-Type', '')
            raw_text = response.read().decode('utf-8', errors='replace')

            if 'application/json' in content_type.lower():
                try:
                    data = json.loads(raw_text)
                except Exception:
                    data = raw_text
            else:
                data = raw_text

            return success_response({'status': status, 'data': data, 'contentType': content_type})
    except HTTPError as error:
        body = error.read().decode('utf-8', errors='replace') if hasattr(error, 'read') else str(error)
        return error_response(f'Upstream HTTP {error.code}: {body[:500]}', 502)
    except URLError as error:
        return error_response(f'Upstream request failed: {error}', 502)
    except Exception as error:  # noqa: BLE001
        current_app.logger.exception('[TOOLS] proxy_fetch failed: %s', error)
        return error_response(str(error), 500)


def _ensure_default_user_tools(user_id: str) -> None:
    if UserTool.query.filter_by(user_id=user_id).first():
        return
    defaults = [
        UserTool(
            user_id=user_id,
            name='Services',
            type='services',
            config_json=json.dumps({'showHomelab': True}),
        ),
        UserTool(
            user_id=user_id,
            name='QR Generator',
            type='qr',
            config_json=json.dumps({'defaultText': ''}),
        ),
    ]
    db.session.add_all(defaults)
    db.session.commit()


@tools_bp.get('/tools/modules', strict_slashes=False)
@auth_required
def list_user_tools():
    user = get_current_user()
    _ensure_default_user_tools(user.id)
    modules = UserTool.query.filter_by(user_id=user.id).order_by(UserTool.updated_at.desc()).all()
    return success_response({'modules': [module.to_dict() for module in modules]})


@tools_bp.post('/tools/modules', strict_slashes=False)
@auth_required
def create_user_tool():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    current_app.logger.info('[TOOLS] create module payload=%s', payload)
    name = str(payload.get('name') or '').strip()
    tool_type = str(payload.get('type') or '').strip()
    config = payload.get('config') if isinstance(payload.get('config'), dict) else {}
    if not name:
        return error_response('name is required', 400)
    if not tool_type:
        return error_response('type is required', 400)
    module = UserTool(user_id=user.id, name=name, type=tool_type, config_json=json.dumps(config))
    db.session.add(module)
    db.session.commit()
    current_app.logger.info('[TOOLS] created module id=%s type=%s', module.id, module.type)
    return success_response(module.to_dict(), 201)


@tools_bp.put('/tools/modules/<string:module_id>', strict_slashes=False)
@auth_required
def update_user_tool(module_id: str):
    user = get_current_user()
    module = UserTool.query.filter_by(id=module_id, user_id=user.id).first_or_404()
    payload = request.get_json(silent=True) or {}
    if 'name' in payload:
        name = str(payload.get('name') or '').strip()
        if not name:
            return error_response('name cannot be empty', 400)
        module.name = name
    if 'type' in payload:
        tool_type = str(payload.get('type') or '').strip()
        if not tool_type:
            return error_response('type cannot be empty', 400)
        module.type = tool_type
    if 'config' in payload:
        module.config_json = json.dumps(payload.get('config') if isinstance(payload.get('config'), dict) else {})
    db.session.commit()
    return success_response(module.to_dict())


@tools_bp.delete('/tools/modules/<string:module_id>', strict_slashes=False)
@auth_required
def delete_user_tool(module_id: str):
    user = get_current_user()
    module = UserTool.query.filter_by(id=module_id, user_id=user.id).first_or_404()
    db.session.delete(module)
    db.session.commit()
    return success_response({'deleted': True, 'id': module_id})

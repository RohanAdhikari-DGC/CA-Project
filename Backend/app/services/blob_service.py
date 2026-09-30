import os
import re
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any

from dotenv import load_dotenv
from azure.storage.blob import (
    BlobServiceClient,
    ContentSettings,
    generate_blob_sas,
    BlobSasPermissions,
)

load_dotenv()

# Local fallback storage directory (used if Azure credentials are not yet set or as cache)
LOCAL_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _sanitize_segment(segment: str, default: str = "general") -> str:
    """
    Sanitize a folder or file name segment for Azure Blob Storage path hierarchy.
    Replaces slashes and unsafe path characters while preserving readable names.
    """
    if not segment or not segment.strip():
        return default
    # Replace forward/backward slashes (e.g. "Debit Note / Debit Memo") with hyphen
    cleaned = re.sub(r"[\\/]+", "-", segment.strip())
    # Remove characters not recommended in blob path segments
    cleaned = re.sub(r'[<>:"|?*\x00-\x1f]', "", cleaned)
    # Collapse multiple spaces
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .")
    return cleaned or default


def build_blob_path(client_name: str, doc_type: str, file_name: str) -> str:
    """
    Build the required Azure Blob folder hierarchy:
    <client_name>/finance/<doctype>/<filename>
    """
    clean_client = _sanitize_segment(client_name, default="Default_Client")
    clean_doctype = _sanitize_segment(doc_type, default="Tax Invoice")
    clean_filename = _sanitize_segment(file_name, default="document.pdf")
    return f"{clean_client}/finance/{clean_doctype}/{clean_filename}"


def _get_azure_config() -> Dict[str, str]:
    """Read Azure Storage configuration dynamically from environment variables."""
    load_dotenv(override=True)
    account_name = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "castorage").strip()
    account_key = os.getenv("AZURE_STORAGE_ACCOUNT_KEY", "").strip()
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "").strip()
    sas_token = os.getenv("AZURE_STORAGE_SAS_TOKEN", "").strip()
    container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "ca-documents").strip().lower()

    # Container names in Azure must be lowercase alphanumeric and hyphens (3-63 chars)
    container_name = re.sub(r"[^a-z0-9\-]", "-", container_name).strip("-")
    if len(container_name) < 3:
        container_name = "ca-documents"

    # Extract account_name / account_key from connection string if present
    if conn_str:
        m_name = re.search(r"AccountName=([^;]+)", conn_str, re.IGNORECASE)
        if m_name:
            account_name = m_name.group(1).strip()
        m_key = re.search(r"AccountKey=([^;]+)", conn_str, re.IGNORECASE)
        if m_key and not account_key:
            account_key = m_key.group(1).strip()

    # If connection string is not provided, construct it when account_name & account_key are set
    if not conn_str and account_name and account_key and not account_key.startswith("<"):
        conn_str = (
            f"DefaultEndpointsProtocol=https;"
            f"AccountName={account_name};"
            f"AccountKey={account_key};"
            f"EndpointSuffix=core.windows.net"
        )

    return {
        "account_name": account_name,
        "account_key": account_key,
        "connection_string": conn_str,
        "sas_token": sas_token,
        "container_name": container_name,
    }


def _get_blob_service_client() -> Tuple[Optional[BlobServiceClient], Dict[str, str]]:
    """Initialize Azure BlobServiceClient if valid credentials are provided."""
    cfg = _get_azure_config()
    conn_str = cfg["connection_string"]
    account_name = cfg["account_name"]
    sas_token = cfg["sas_token"]

    # Check if placeholder values are still in .env
    if conn_str and "YOUR_AZURE" not in conn_str and "<" not in conn_str:
        try:
            client = BlobServiceClient.from_connection_string(conn_str)
            return client, cfg
        except Exception as e:
            print(f"Warning: Could not initialize BlobServiceClient from connection string: {e}")

    if account_name and sas_token and "YOUR_AZURE" not in sas_token and "<" not in sas_token:
        try:
            account_url = f"https://{account_name}.blob.core.windows.net"
            credential = sas_token if sas_token.startswith("?") else f"?{sas_token}"
            client = BlobServiceClient(account_url=account_url, credential=credential)
            return client, cfg
        except Exception as e:
            print(f"Warning: Could not initialize BlobServiceClient from SAS token: {e}")

    return None, cfg


def upload_document_to_blob(
    file_bytes: bytes,
    client_name: str,
    doc_type: str,
    file_name: str,
    content_type: str = "application/pdf",
) -> Dict[str, Any]:
    """
    Upload an image or PDF document to Azure Blob Storage under:
      Storage Account: castorage (or AZURE_STORAGE_ACCOUNT_NAME)
      Container: AZURE_STORAGE_CONTAINER_NAME
      Folder path: <client_name>/finance/<doctype>/<file_name>

    Also saves a local fallback copy so preview/streaming always works.
    Returns dict with:
      - blob_path: "<client_name>/finance/<doctype>/<file_name>"
      - blob_url: Full Azure Blob URL (with read SAS token if account key is available)
      - uploaded_to_azure: bool
      - container_name: str
      - storage_account: str
    """
    blob_path = build_blob_path(client_name=client_name, doc_type=doc_type, file_name=file_name)

    # Always save local copy in matching folder structure for fast fallback streaming
    local_file_path = LOCAL_UPLOADS_DIR / blob_path
    local_file_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        local_file_path.write_bytes(file_bytes)
    except Exception as e:
        print(f"Warning: Could not write local cache copy: {e}")

    service_client, cfg = _get_blob_service_client()
    container_name = cfg["container_name"]
    account_name = cfg["account_name"]
    account_key = cfg["account_key"]
    sas_token = cfg["sas_token"]

    if service_client is None:
        print(
            f"Notice: Azure Blob credentials not yet configured for '{account_name}'. "
            f"Saved locally at uploads/{blob_path}"
        )
        return {
            "blob_path": blob_path,
            "blob_url": None,
            "uploaded_to_azure": False,
            "container_name": container_name,
            "storage_account": account_name,
        }

    try:
        container_client = service_client.get_container_client(container_name)
        if not container_client.exists():
            container_client.create_container()
            print(f"Created Azure Blob container '{container_name}' in storage account '{account_name}'.")

        blob_client = container_client.get_blob_client(blob_path)
        blob_client.upload_blob(
            file_bytes,
            overwrite=True,
            content_settings=ContentSettings(
                content_type=content_type,
                content_disposition="inline",
            ),
        )

        base_blob_url = blob_client.url
        final_url = base_blob_url

        # Generate a Read SAS token if account_key is available so private containers can render in browser
        if account_key and "YOUR_AZURE" not in account_key:
            try:
                sas_query = generate_blob_sas(
                    account_name=account_name,
                    container_name=container_name,
                    blob_name=blob_path,
                    account_key=account_key,
                    permission=BlobSasPermissions(read=True),
                    expiry=datetime.now(timezone.utc) + timedelta(days=365),
                )
                if sas_query:
                    final_url = f"{base_blob_url}?{sas_query}"
            except Exception as sas_err:
                print(f"Notice: Could not generate SAS URL, using direct blob URL: {sas_err}")
        elif sas_token and "?" not in base_blob_url:
            clean_sas = sas_token.lstrip("?")
            final_url = f"{base_blob_url}?{clean_sas}"

        print(f"Uploaded to Azure Blob Storage: {account_name}/{container_name}/{blob_path}")
        return {
            "blob_path": blob_path,
            "blob_url": final_url,
            "uploaded_to_azure": True,
            "container_name": container_name,
            "storage_account": account_name,
        }
    except Exception as e:
        print(f"Warning: Azure Blob Storage upload failed ({e}). Using local fallback for {blob_path}.")
        return {
            "blob_path": blob_path,
            "blob_url": None,
            "uploaded_to_azure": False,
            "container_name": container_name,
            "storage_account": account_name,
            "error": str(e),
        }


def download_document_bytes(blob_path: str) -> Optional[bytes]:
    """
    Retrieve document bytes from Azure Blob Storage (or local fallback if offline/unconfigured).
    """
    if not blob_path:
        return None

    # 1. Check local cache first for speed
    local_file_path = LOCAL_UPLOADS_DIR / blob_path
    if local_file_path.exists() and local_file_path.is_file():
        try:
            return local_file_path.read_bytes()
        except Exception:
            pass

    # 2. Download from Azure Blob Storage
    service_client, cfg = _get_blob_service_client()
    if service_client is not None:
        try:
            container_client = service_client.get_container_client(cfg["container_name"])
            blob_client = container_client.get_blob_client(blob_path)
            if blob_client.exists():
                data = blob_client.download_blob().readall()
                # Cache locally
                try:
                    local_file_path.parent.mkdir(parents=True, exist_ok=True)
                    local_file_path.write_bytes(data)
                except Exception:
                    pass
                return data
        except Exception as e:
            print(f"Warning: Failed to download blob '{blob_path}' from Azure: {e}")

    return None


def get_blob_storage_status() -> Dict[str, Any]:
    """Return current configuration status of Azure Blob Storage."""
    service_client, cfg = _get_blob_service_client()
    is_configured = service_client is not None
    connected = False
    error_msg = None

    if is_configured:
        try:
            container_client = service_client.get_container_client(cfg["container_name"])
            connected = container_client.exists() or True
        except Exception as e:
            error_msg = str(e)

    return {
        "storage_account": cfg["account_name"],
        "container_name": cfg["container_name"],
        "folder_structure": "<client_name>/finance/<doctype>/<filename>",
        "credentials_configured": is_configured,
        "connected": connected,
        "error": error_msg,
    }

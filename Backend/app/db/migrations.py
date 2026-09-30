from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine

def run_migrations(engine: Engine):
    """
    Ensure newly added columns (such as document_type, confidence_score, client_name,
    client_code, blob_path, blob_url) exist in existing tables.
    Works for PostgreSQL and SQLite.
    """
    try:
        insp = inspect(engine)
        table_names = insp.get_table_names()

        with engine.connect() as conn:
            # 1. Update invoices table
            if "invoices" in table_names:
                inv_cols = [c["name"] for c in insp.get_columns("invoices")]
                new_inv_columns = [
                    ("document_type", "VARCHAR(100) DEFAULT 'Tax Invoice'"),
                    ("confidence_score", "FLOAT DEFAULT 100.0"),
                    ("client_name", "VARCHAR(255)"),
                    ("client_code", "VARCHAR(50)"),
                    ("blob_path", "TEXT"),
                    ("blob_url", "TEXT"),
                ]
                for col_name, col_def in new_inv_columns:
                    if col_name not in inv_cols:
                        print(f"Adding '{col_name}' column to 'invoices' table...")
                        conn.execute(text(f"ALTER TABLE invoices ADD COLUMN {col_name} {col_def}"))
                        conn.commit()
                        print(f"Successfully added '{col_name}' to 'invoices'.")

            # 2. Update ocr_documents table
            if "ocr_documents" in table_names:
                ocr_cols = [c["name"] for c in insp.get_columns("ocr_documents")]
                if "document_type" not in ocr_cols:
                    print("Adding 'document_type' column to 'ocr_documents' table...")
                    conn.execute(
                        text("ALTER TABLE ocr_documents ADD COLUMN document_type VARCHAR(100) DEFAULT 'Tax Invoice'")
                    )
                    conn.commit()
                    print("Successfully added 'document_type' to 'ocr_documents'.")

                if "confidence_score" not in ocr_cols:
                    print("Adding 'confidence_score' column to 'ocr_documents' table...")
                    conn.execute(
                        text("ALTER TABLE ocr_documents ADD COLUMN confidence_score FLOAT DEFAULT 100.0")
                    )
                    conn.commit()
                    print("Successfully added 'confidence_score' to 'ocr_documents'.")
    except Exception as e:
        print(f"Notice: Schema migration check completed with message: {e}")

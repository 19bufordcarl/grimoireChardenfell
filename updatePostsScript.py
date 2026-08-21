import re
from pathlib import Path

def fix_page_number_sign(filepath: Path):
    """Remove # from Page #N in sources line."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Simple replacement: Page #N -> Page N
        updated_content = re.sub(r'Page #(\d+)', r'Page \1', content)
        
        if updated_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            return True
        return False
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    posts_dir = Path("_posts")  # Update this to your posts directory
    
    if not posts_dir.exists():
        print(f"Error: Cannot find {posts_dir}")
        return
    
    markdown_files = list(posts_dir.glob("*.markdown")) + list(posts_dir.glob("*.md"))
    print(f"Found {len(markdown_files)} markdown files")
    
    updated_count = 0
    unchanged_count = 0
    
    for filepath in markdown_files:
        result = fix_page_number_sign(filepath)
        if result:
            updated_count += 1
            print(f"✓ Updated: {filepath.name}")
        else:
            unchanged_count += 1
    
    print(f"\n{'='*50}")
    print(f"Update complete!")
    print(f"Updated: {updated_count} files")
    print(f"Unchanged: {unchanged_count} files")

if __name__ == "__main__":
    main()
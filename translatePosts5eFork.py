import re
from pathlib import Path

# ===== CONFIGURATION =====
INPUT_DIR = "_posts"
OUTPUT_DIR = "spells_5e_fork"

# Tags to keep (everything else is treated as a class tag and removed)
KEEP_TAGS = {
    # Levels
    'cantrip', 'level1', 'level2', 'level3', 'level4', 'level5',
    'level6', 'level7', 'level8', 'level9',
    # Casting time
    'action', 'bonus', 'reaction', 'long',
    # Schools
    'abjuration', 'conjuration', 'divination', 'enchantment',
    'evocation', 'illusion', 'necromancy', 'transmutation',
    # Other
    'ritual', 'concentration',
}

# Subtag keys to keep (everything else removed)
KEEP_SUBTAG_KEYS = {'damage'}
# =========================


def process_file(filepath: Path):
    """Read a spell markdown file and return (new_filename, new_content)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split frontmatter and body
    match = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.DOTALL)
    if not match:
        return None, None

    fm_text = match.group(1)
    body = match.group(2).lstrip('\n')

    # Parse frontmatter
    fields = {}
    subtag_items = []
    in_subtags = False

    for line in fm_text.split('\n'):
        # Skip list items unless we're in subtags
        if line.startswith('  - '):
            if in_subtags:
                subtag_items.append(line[4:].strip())
            continue

        # Any non-list line ends the subtags block
        in_subtags = False

        if ':' not in line:
            continue

        key, value = line.split(':', 1)
        key = key.strip()
        value = value.strip()

        if key == 'subtags':
            if value.startswith('['):
                # Inline format: [damage: fire, druid: land]
                inner = value.strip('[]')
                for item in inner.split(','):
                    item = item.strip()
                    if item:
                        subtag_items.append(item)
            else:
                # YAML list format follows
                in_subtags = True
        else:
            fields[key] = value

    # Extract title (strip surrounding quotes)
    title = fields.get('title', '').strip().strip('"').strip("'")

    # Filter tags
    tags_str = fields.get('tags', '').strip()
    if tags_str.startswith('[') and tags_str.endswith(']'):
        tags_str = tags_str[1:-1]
    all_tags = [t.strip() for t in tags_str.split(',') if t.strip()]
    kept_tags = [t for t in all_tags if t.lower() in KEEP_TAGS]

    # Filter subtags (keep only damage)
    kept_subtags = []
    for item in subtag_items:
        if ':' not in item:
            continue
        key, value = item.split(':', 1)
        if key.strip().lower() in KEEP_SUBTAG_KEYS:
            kept_subtags.append((key.strip(), value.strip()))

    # Rebuild frontmatter
    new_fm = ['---']
    new_fm.append('layout: post')
    new_fm.append(f'title: "{title}"')
    if 'date' in fields:
        new_fm.append(f'date: {fields["date"]}')
    if 'sources' in fields:
        new_fm.append(f'sources: {fields["sources"]}')
    new_fm.append(f'tags: [{", ".join(kept_tags)}]')
    if kept_subtags:
        new_fm.append('subtags:')
        for key, value in kept_subtags:
            new_fm.append(f'  - {key}: {value}')
    new_fm.append('---')

    # Build final content with header
    new_content = '\n'.join(new_fm) + '\n\n# ' + title + '\n\n' + body
    if not new_content.endswith('\n'):
        new_content += '\n'

    # New filename
    safe_title = re.sub(r'[<>:"/\\|?*]', '', title)
    new_filename = f"{safe_title}.md"

    return new_filename, new_content


def main():
    input_path = Path(INPUT_DIR)
    output_path = Path(OUTPUT_DIR)

    if not input_path.exists():
        print(f"Error: Cannot find {INPUT_DIR}")
        print(f"Current directory: {Path.cwd()}")
        return

    output_path.mkdir(exist_ok=True)

    files = sorted(
        list(input_path.glob("*.markdown")) + list(input_path.glob("*.md"))
    )
    print(f"Found {len(files)} files in {INPUT_DIR}")
    print(f"Output: {OUTPUT_DIR}/")
    print()

    converted = 0
    errors = 0

    for filepath in files:
        try:
            new_filename, new_content = process_file(filepath)
            if new_filename is None:
                print(f"✗ Skipping {filepath.name} (no frontmatter)")
                errors += 1
                continue

            with open(output_path / new_filename, 'w', encoding='utf-8') as f:
                f.write(new_content)

            converted += 1
            print(f"✓ {filepath.name} -> {new_filename}")

        except Exception as e:
            print(f"✗ Error processing {filepath.name}: {e}")
            errors += 1

    print(f"\n{'='*50}")
    print(f"Converted: {converted}")
    print(f"Errors: {errors}")
    print(f"Output directory: {output_path}")


if __name__ == "__main__":
    main()
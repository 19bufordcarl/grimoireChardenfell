let activeTags = [];

function atomMatches(atom, tagArray) {
    let flip = false;
    while (atom.startsWith('!')){
        atom = atom.substring(1);
        flip = !flip;
    }
    
    const value = atom === '' || atom === 'true' || atom !== 'false' && tagArray.some(tag => {
        if (tag === atom) return true;
        if (tag.includes(':') && tag.split(':').some(part => part === atom)) {
            return true;
        }
        return false;
    });
    
    return flip ^ value;
}

function matchTagList0(query, tagArray) {
    const parenRegex = /\([^\(\)]*\)/;
    let newQuery = query;
    do {
        query = newQuery;
        newQuery = query.replace(parenRegex, (m) => {
            const v = matchTagList0(m.slice(1, -1), tagArray);
            return v ? 'true' : 'false';
        });
    } while (newQuery !== query);

    return newQuery.split('|').some((part) => part.split('&').every((part2) => atomMatches(part2, tagArray)));
}

function matchTagList(searchQuery, tagList){
    const tagArray = tagList.split(',').map((tag) => tag.replaceAll(/\s+/g, '').replaceAll(/\..*$/g, '').toLowerCase());
    return matchTagList0(searchQuery.replaceAll(/\s+/g, ''), tagArray);
}

function getTagCategory(tagValue) {
    // Determine the category of a tag
    if (tagValue.startsWith('level') || tagValue === 'cantrip') {
        return 'level';
    }
    if (['action', 'bonus', 'reaction', 'long'].includes(tagValue)) {
        return 'castingTime';
    }
    if (['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 
         'illusion', 'necromancy', 'transmutation'].includes(tagValue)) {
        return 'school';
    }
    if (['ritual', 'concentration'].includes(tagValue)) {
        return 'other';
    }
    // If tag contains a colon, it's a subclass
    if (tagValue.includes(':')) {
        const parentClass = tagValue.split(':')[0];
        return `class:${parentClass}`;
    }
    // Otherwise it's a base class
    return 'class';
}

function addTag(tagValue, tagLabel) {
    if (activeTags.some(t => t.value === tagValue)) {
        return;
    }
    
    activeTags.push({ value: tagValue, label: tagLabel });
    updateActiveFilters();
    applyFilters();
}

function removeTag(tagValue) {
    activeTags = activeTags.filter(t => t.value !== tagValue);
    updateActiveFilters();
    applyFilters();
}

function clearAllTags() {
    activeTags = [];
    updateActiveFilters();
    applyFilters();
}

function updateActiveFilters() {
    const container = document.getElementById('activeFilters');
    if (!container) return;
    
    if (activeTags.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<span class="filter-label">Active filters:</span> ';
    activeTags.forEach(tag => {
        html += `<button class="filter-chip" data-tag="${tag.value}" title="Remove filter">
            ${tag.label} ×
        </button>`;
    });
    html += `<button class="filter-chip clear-all" title="Clear all filters">Clear all</button>`;
    
    container.innerHTML = html;
    
    container.querySelectorAll('.filter-chip[data-tag]').forEach(chip => {
        chip.addEventListener('click', () => removeTag(chip.dataset.tag));
    });
    
    container.querySelector('.clear-all').addEventListener('click', clearAllTags);
}

function matchSource(sourceQuery, sourcesData) {
    if (!sourceQuery) return true;
    
    const sourcesNormalized = sourcesData.toLowerCase();
    const queryNormalized = sourceQuery.toLowerCase();
    
    if (sourcesNormalized.includes(queryNormalized)) {
        return true;
    }
    
    const abbrMatches = sourcesData.match(/\[([A-Z]+)\.\d+\]/g);
    if (abbrMatches) {
        return abbrMatches.some(abbr => abbr.toLowerCase().includes(queryNormalized));
    }
    
    return false;
}

function applyFilters() {
    const sourceSearchBar = document.getElementById('sourceSearchBar');
    const sourceQuery = sourceSearchBar ? sourceSearchBar.value : '';
    
    Array.from(document.querySelectorAll("li.post-link-container")).filter((elem) => {
        return !!elem.dataset['tags'];
    }).forEach((elem) => {
        let shouldShow = true;
        
        // Group active tags by category
        const tagsByCategory = {};
        activeTags.forEach(tag => {
            const category = getTagCategory(tag.value);
            if (!tagsByCategory[category]) {
                tagsByCategory[category] = [];
            }
            tagsByCategory[category].push(tag);
        });
        
        // Apply AND logic between categories
        for (const category in tagsByCategory) {
            const categoryTags = tagsByCategory[category];
            
            // Within same category, use OR logic
            const matchesCategory = categoryTags.some(tag => {
                return matchTagList(tag.value, elem.dataset['tags']);
            });
            
            if (!matchesCategory) {
                shouldShow = false;
                break;
            }
        }
        
        // Apply source filter
        if (shouldShow && sourceQuery) {
            const sources = elem.dataset['sources'] || '';
            shouldShow = matchSource(sourceQuery, sources);
        }
        
        if (shouldShow) {
            elem.classList.remove("tagsearch-hide");
            elem.classList.remove("sourcesearch-hide");
        } else {
            elem.classList.add("tagsearch-hide");
        }
    });
}

async function ready() {
    const tagSearchBar = document.getElementById("tagSearchBar");
    if (!tagSearchBar) {
        return;
    }
    
    const sourceSearchBar = document.getElementById("sourceSearchBar");
    
    // Parse URL params for initial tags
    const params = new URLSearchParams(window.location.search);
    if (params.get("tags")){
        const tags = params.get("tags").split(',');
        tags.forEach(tag => {
            const option = tagSearchBar.querySelector(`option[value="${tag}"]`);
            if (option) {
                addTag(tag, option.textContent.trim());
            }
        });
    }
    
    // Tag dropdown handler
    tagSearchBar.addEventListener('change', (e) => {
        const selectedOption = tagSearchBar.options[tagSearchBar.selectedIndex];
        if (selectedOption.value) {
            addTag(selectedOption.value, selectedOption.textContent.trim());
            tagSearchBar.value = '';
        }
    });
    
    // Source dropdown handler
    if (sourceSearchBar) {
        sourceSearchBar.addEventListener('change', applyFilters);
    }
    
    return Promise.all([applyFilters()]);
}

document.addEventListener("DOMContentLoaded", ready);

/* jets initialization */
var jets = null;
document.addEventListener('DOMContentLoaded', () => {
    const menuClick = () => {
        const menu = document.getElementById('menu');
        if (menu.className.match(/(?:^|\s)show(?!\S)/)) {
            menu.className = menu.className.replace( /(?:^|\s)show(?!\S)/g, '');
        } else {
            menu.className += ' show';
        }
        const menu2 = document.getElementById('menu2');
        if (menu2.className.match(/(?:^|\s)show(?!\S)/)) {
            menu2.className = menu2.className.replace(/(?:^|\s)show(?!\S)/g, '');
        } else {
            menu2.className += ' show';
        }
    };
    document.getElementById('menuIcon').addEventListener('click', menuClick);
    if (document.getElementById('jetsSearch')) {
        jets = new Jets({
            searchTag: '#jetsSearch',
            contentTag: '.jetsContent',
            didSearch: (search_phrase) => {
                const elements = document.getElementsByClassName('jetsHide');
                if (!search_phrase.trim()) {
                    for (let i = 0; i < elements.length; i++) {
                        elements[i].classList.remove('searchHide');
                    }
                } else {
                    for (let i = 0; i < elements.length; i++) {
                        elements[i].classList.add('searchHide');
                    }
                }
            },
        });
    }
});
let activeTags = [];
let allTagOptions = [];

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
    if (tagValue.includes(':')) {
        return 'subclass';
    }
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
    const advancedTagBar = document.getElementById('advancedTagBar');
    const advancedQuery = advancedTagBar ? advancedTagBar.value.trim() : '';
    
    Array.from(document.querySelectorAll("li.post-link-container")).filter((elem) => {
        return !!elem.dataset['tags'];
    }).forEach((elem) => {
        let shouldShow = true;
        
        if (activeTags.length > 0) {
            const tagsByCategory = {};
            activeTags.forEach(tag => {
                const category = getTagCategory(tag.value);
                if (!tagsByCategory[category]) {
                    tagsByCategory[category] = [];
                }
                tagsByCategory[category].push(tag);
            });
            
            for (const category in tagsByCategory) {
                const categoryTags = tagsByCategory[category];
                const matchesCategory = categoryTags.some(tag => {
                    return matchTagList(tag.value, elem.dataset['tags']);
                });
                
                if (!matchesCategory) {
                    shouldShow = false;
                    break;
                }
            }
        }
        
        if (shouldShow && advancedQuery) {
            shouldShow = matchTagList(advancedQuery, elem.dataset['tags']);
        }
        
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

// Autocomplete functionality
function setupAutocomplete() {
    const advancedTagBar = document.getElementById('advancedTagBar');
    if (!advancedTagBar) return;
    
    // Create autocomplete dropdown
    const autocompleteDiv = document.createElement('div');
    autocompleteDiv.className = 'autocomplete-items';
    autocompleteDiv.style.display = 'none';
    autocompleteDiv.style.position = 'absolute';
    autocompleteDiv.style.left = '0';
    autocompleteDiv.style.top = '100%';
    autocompleteDiv.style.width = '100%';
    advancedTagBar.parentElement.style.position = 'relative';
    advancedTagBar.parentElement.appendChild(autocompleteDiv);
    
    let selectedIndex = -1;
    
    // Build list of all possible tags
    function buildAllTags() {
        const tags = new Set();
        
        // Add from dropdown options
        const select = document.getElementById('tagSearchBar');
        if (select) {
            Array.from(select.options).forEach(option => {
                if (option.value) {
                    tags.add(option.value);
                }
            });
        }
        
        // Add classes
        const classes = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];
        classes.forEach(c => tags.add(c));
        
        // Add subclasses from data attributes in the page
        document.querySelectorAll('li.post-link-container').forEach(elem => {
            const dataTags = elem.dataset['tags'] || '';
            const tagArray = dataTags.split(',');
            tagArray.forEach(tag => {
                // Don't convert kebab-case - keep as is
                // The tags are already in the correct format
                if (tag && tag.trim()) {
                    tags.add(tag.trim());
                }
            });
        });
        
        // Add levels
        for (let i = 0; i <= 9; i++) {
            tags.add(i === 0 ? 'cantrip' : `level${i}`);
        }
        
        // Add damage types
        const damageTypes = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 
                            'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
        damageTypes.forEach(d => tags.add(`damage:${d}`));
        
        return Array.from(tags).sort();
    }
    
    allTagOptions = buildAllTags();
    
    function getCurrentWord(input) {
        const cursorPos = input.selectionStart;
        const textBeforeCursor = input.value.substring(0, cursorPos);
        const words = textBeforeCursor.split(/[\s&|!()]+/);
        return words[words.length - 1] || '';
    }
    
    function getMatches(query) {
        if (!query) return [];
        return allTagOptions.filter(tag => tag.includes(query.toLowerCase()));
    }
    
    function showSuggestions(query) {
        if (!query) {
            autocompleteDiv.style.display = 'none';
            selectedIndex = -1;
            return;
        }
        
        const matches = getMatches(query);
        
        if (matches.length === 0) {
            autocompleteDiv.style.display = 'none';
            selectedIndex = -1;
            return;
        }
        
        autocompleteDiv.innerHTML = '';
        matches.slice(0, 10).forEach((tag, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = tag;
            item.dataset.index = index;
            
            item.addEventListener('click', () => {
                insertTag(tag);
            });
            
            item.addEventListener('mouseenter', () => {
                selectedIndex = index;
                highlightSelected();
            });
            
            autocompleteDiv.appendChild(item);
        });
        
        autocompleteDiv.style.display = 'block';
        selectedIndex = -1;
    }
    
    function highlightSelected() {
        const items = autocompleteDiv.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('autocomplete-item-selected');
            } else {
                item.classList.remove('autocomplete-item-selected');
            }
        });
    }
    
    function insertTag(tag) {
        const cursorPos = advancedTagBar.selectionStart;
        const textBeforeCursor = advancedTagBar.value.substring(0, cursorPos);
        const textAfterCursor = advancedTagBar.value.substring(cursorPos);
        const words = textBeforeCursor.split(/([\s&|!()]+)/);
        
        // Find the last word
        for (let i = words.length - 1; i >= 0; i--) {
            if (words[i].trim() && !'&|!()'.includes(words[i].trim())) {
                words[i] = tag;
                break;
            }
        }
        
        advancedTagBar.value = words.join('') + textAfterCursor;
        autocompleteDiv.style.display = 'none';
        selectedIndex = -1;
        advancedTagBar.focus();
        applyFilters();
    }
    
    advancedTagBar.addEventListener('input', () => {
        const currentWord = getCurrentWord(advancedTagBar);
        showSuggestions(currentWord);
        applyFilters();
    });
    
    advancedTagBar.addEventListener('keydown', (e) => {
        const matches = getMatches(getCurrentWord(advancedTagBar));
        
        if (e.key === 'Escape') {
            autocompleteDiv.style.display = 'none';
            selectedIndex = -1;
        } else if (e.key === 'ArrowDown' && matches.length > 0) {
            e.preventDefault();
            if (selectedIndex < matches.length - 1) {
                selectedIndex++;
            } else {
                selectedIndex = 0;
            }
            highlightSelected();
        } else if (e.key === 'ArrowUp' && matches.length > 0) {
            e.preventDefault();
            if (selectedIndex > 0) {
                selectedIndex--;
            } else {
                selectedIndex = matches.length - 1;
            }
            highlightSelected();
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            const selectedTag = matches[selectedIndex];
            if (selectedTag) {
                insertTag(selectedTag);
            }
        } else if (e.key === 'Tab' && selectedIndex >= 0) {
            e.preventDefault();
            const selectedTag = matches[selectedIndex];
            if (selectedTag) {
                insertTag(selectedTag);
            }
        }
    });
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== advancedTagBar && !autocompleteDiv.contains(e.target)) {
            autocompleteDiv.style.display = 'none';
            selectedIndex = -1;
        }
    });
}

async function ready() {
    const tagSearchBar = document.getElementById("tagSearchBar");
    if (!tagSearchBar) {
        return;
    }
    
    const sourceSearchBar = document.getElementById("sourceSearchBar");
    const advancedTagBar = document.getElementById("advancedTagBar");
    
    // Tag dropdown handler
    tagSearchBar.addEventListener('change', (e) => {
        const selectedOption = tagSearchBar.options[tagSearchBar.selectedIndex];
        if (selectedOption.value) {
            addTag(selectedOption.value, selectedOption.textContent.trim());
            tagSearchBar.value = '';
        }
    });
    
    // Advanced search handler
    if (advancedTagBar) {
        advancedTagBar.addEventListener('input', applyFilters);
    }
    
    // Source dropdown handler
    if (sourceSearchBar) {
        sourceSearchBar.addEventListener('change', applyFilters);
    }
    
    // Toggle advanced filters
    const toggleAdvanced = document.getElementById('toggleAdvanced');
    const advancedFilters = document.getElementById('advancedFilters');
    
    if (toggleAdvanced && advancedFilters) {
        toggleAdvanced.addEventListener('click', () => {
            if (advancedFilters.style.display === 'none') {
                advancedFilters.style.display = 'block';
                toggleAdvanced.textContent = 'Hide advanced filters';
            } else {
                advancedFilters.style.display = 'none';
                toggleAdvanced.textContent = 'Show advanced filters';
            }
        });
    }
    
    // Setup autocomplete
    setupAutocomplete();
    
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
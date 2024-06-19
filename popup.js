// popup.js

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentUrl = tabs[0].url;
        if (!isYouTubeUrl(currentUrl)) {
            document.getElementById('searchInCommentsWrapper').textContent = 'Cette extension ne fonctionne que sur Youtube'

        } else {
            const searchInput = document.getElementById('searchInput');
            const loadingIndicator = document.getElementById('loadingIndicator');

            if (searchInput) {
                searchInput.focus();

                // Recherche lorsque la touche "Entrée" est pressée dans l'input de recherche
                searchInput.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        executeSearch();
                    }
                });
            }

            // Recherche lorsque le bouton de recherche est cliqué
            if (searchButton) {
                searchButton.addEventListener('click', () => {
                    executeSearch();
                });
            }
        }
    });

});

function isYouTubeUrl(url) {
    // Vérifie si l'URL appartient à YouTube
    return url.includes('youtube.com') || url.includes('youtu.be');
}

async function executeSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (searchTerm) {
        if (document.getElementById('commentsContainer')) {
            document.getElementById('commentsContainer').style.display = 'none';
        }

        loadingIndicator.style.display = 'block'; // Affiche l'indicateur de chargement

        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        const tab = tabs[0];
        const videoId = extractVideoId(tab.url);

        if (videoId) {
            const comments = await loadAllComments(videoId);
            const filteredComments = filterComments(comments, searchTerm);
            displayComments(filteredComments, searchTerm);
        } else {
            console.error('Unable to extract video ID from URL');
        }

        loadingIndicator.style.display = 'none'; // Masque l'indicateur de chargement après la recherche
        if (document.getElementById('commentsContainer')) {
            document.getElementById('commentsContainer').style.display = 'block';
        }
    } else {
        console.log('Please enter a search term');
    }
}

function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/ ]{11})/);
    return match ? match[1] : null;
}

async function loadAllComments(videoId) {
    const apiKey = 'APIKEY'; // Ta propre clé d'API YouTube
    const maxResults = 100; // Nombre maximal de commentaires par page
    const maxTotalComments = 10000;
    let allComments = [];
    let nextPageToken = null;
    let totalCommentsCount = 0;

    do {
        const apiUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&maxResults=${maxResults}&pageToken=${nextPageToken || ''}`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.items) {
                const comments = data.items.map(item => item.snippet.topLevelComment.snippet);
                allComments = [...allComments, ...comments];
                totalCommentsCount += comments.length;

                // Si le nombre total de commentaires atteint ou dépasse 10 000, arrêter la récupération
                if (totalCommentsCount >= maxTotalComments) {
                    console.error('Max comments loading is 10000', error);
                    break;
                }
            }

            nextPageToken = data.nextPageToken;
        } catch (error) {
            console.error('Error loading comments:', error);
            break;
        }
    } while (nextPageToken);

    return allComments;
}

function displayComments(comments, searchTerm) {
    const commentsContainer = document.getElementById('commentsContainer');
    commentsContainer.innerHTML = ''; // Efface le contenu précédent

    if (comments.length === 0) {
        const noResultsElement = document.createElement('p');
        noResultsElement.textContent = 'Aucun commentaire trouvé correspondant à la recherche.';
        commentsContainer.appendChild(noResultsElement);
    } else {
        comments.forEach(comment => {
            const commentElement = document.createElement('p');
            commentElement.textContent = comment.textOriginal

            // Image
            const authorInfo = document.createElement('div');
            authorInfo.classList.add('author-info','flex');
            const authorImage = document.createElement('img');
            authorImage.src = comment.authorProfileImageUrl;
            authorImage.alt = comment.authorDisplayName;
            authorImage.classList.add('author-image');
            authorInfo.appendChild(authorImage);

            // Name
            const wrapperName = document.createElement('div');
            const authorName = document.createElement('span');
            authorName.textContent = comment.authorDisplayName;
            authorName.classList.add('author-name');
            wrapperName.appendChild(authorName);
            // Date
            const commentDate = document.createElement('p');
            let date = new Date(comment.publishedAt);
            date = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
            commentDate.textContent = date;
            commentDate.classList.add('comment-date');
            wrapperName.appendChild(commentDate);
            authorInfo.appendChild(wrapperName);

            commentsContainer.appendChild(authorInfo); // Ajoute l'élément au conteneur des commentaires
            commentsContainer.appendChild(commentElement); // Ajoute l'élément au conteneur des commentaires

            // Surligne le terme recherché dans le commentaire
            highlightSearchTerm(commentElement, searchTerm);
        });
    }
}

function highlightSearchTerm(element, searchTerm) {
    if (element && element.textContent) {
        element.innerHTML = element.textContent.replaceAll(searchTerm, '<span style="background-color: yellow">' + searchTerm + '</span>')
    }
}

function filterComments(comments, searchTerm) {
    return comments.filter(comment => {
        const lowerCaseComment = comment.textOriginal.toLowerCase();
        return lowerCaseComment.includes(searchTerm.toLowerCase());
    });
}

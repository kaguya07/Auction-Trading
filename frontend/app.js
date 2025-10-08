const API_URL = "http://localhost:5000/api"; // connect to backend

document.addEventListener('DOMContentLoaded', () => {
    updateNav();
    const path = window.location.pathname.split('/').pop();

    if (path === 'listings.html') {
        loadListings();
    } else if (path === 'login.html') {
        setupLogin();
    } else if (path === 'auction.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const auctionId = urlParams.get('id');
        if (auctionId) {
            loadAuction(auctionId);
        }
    } else if (path === 'add-listing.html') {
        setupAddListingForm();
    } else if (path === 'edit-listing.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const listingId = urlParams.get('id');
        if (listingId) {
            setupEditListingForm(listingId);
        }
    }
});

function updateNav() {
    const token = localStorage.getItem('token');
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logoutLink');
    const addListingLink = document.getElementById('addListingLink');

    if (token) {
        if (loginLink) loginLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'inline';
        if (addListingLink) addListingLink.style.display = 'inline';
    } else {
        if (loginLink) loginLink.style.display = 'inline';
        if (logoutLink) logoutLink.style.display = 'none';
        if (addListingLink) addListingLink.style.display = 'none';
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }
}

async function loadListings() {
    const listingsContainer = document.getElementById('listings-container');
    if (!listingsContainer) return;

    try {
        const res = await fetch(`${API_URL}/listings`);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const listings = await res.json();

        if (!listings.length) {
            listingsContainer.innerHTML = `<p>No listings available.</p>`;
            return;
        }

        const token = localStorage.getItem('token');
        let userId = null;
        if (token) {
            try {
                userId = JSON.parse(atob(token.split('.')[1])).id;
            } catch (e) {
                console.error('Invalid token:', e);
                localStorage.removeItem('token'); // Clear invalid token
            }
        }

        listingsContainer.innerHTML = listings.map(l => {
            const isOwner = l.seller && l.seller._id === userId;
            const highestBidderName = l.highestBidder ? l.highestBidder.name : 'No bids yet';
            const winnerName = l.winner ? l.winner.name : 'N/A';
            
            let cardClass = 'product-card';
            let statusText = '';
            if (l.status === 'ended') {
                cardClass += ' ended';
                statusText = 'Auction Ended';
            } else if (l.status === 'pending') {
                cardClass += ' pending';
                statusText = 'Starts Soon';
            }

            return `
                <div class="${cardClass}">
                    <div class="status-overlay">
                        <span>${statusText}</span>
                    </div>
                    <a href="auction.html?id=${l._id}" class="card-link">
                        <div class="product-image">
                            <img src="${l.image}" alt="${l.title}">
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${l.title}</h3>
                            <p class="product-description">${l.description.substring(0, 100)}...</p>
                            <div class="product-price">
                                <span class="price-label">${l.status === 'ended' ? 'Winning Bid:' : 'Current Bid:'}</span>
                                <span class="price-value">₹${l.currentBid.toLocaleString()}</span>
                            </div>
                            <div class="highest-bidder">
                                <span class="bidder-label">${l.status === 'ended' ? 'Winner:' : 'Highest Bid by:'}</span>
                                <span class="bidder-name">${l.status === 'ended' ? winnerName : highestBidderName}</span>
                            </div>
                        </div>
                    </a>
                    ${isOwner ? `
                        <div class="owner-actions">
                            <a href="edit-listing.html?id=${l._id}" class="btn-edit">Edit</a>
                            <button onclick="deleteListing('${l._id}')" class="btn-delete">Delete</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join("");
    } catch (error) {
        console.error("Failed to load listings:", error);
        listingsContainer.innerHTML = `<p>Error loading listings. Please try again later.</p>`;
    }
}

async function loadAuction(id) {
    const auctionDetails = document.getElementById('auction-details');
    if (!auctionDetails) return;

    try {
        const res = await fetch(`${API_URL}/listings/${id}`);
        if (!res.ok) {
            auctionDetails.innerHTML = `<p>Listing not found.</p>`;
            return;
        }
        const listing = await res.json();

        if (!listing) {
            auctionDetails.innerHTML = `<p>Listing not found.</p>`;
            return;
        }

        const token = localStorage.getItem('token');
        let userId = null;
        if (token) {
            try {
                userId = JSON.parse(atob(token.split('.')[1])).id;
            } catch (e) {
                console.error('Invalid token:', e);
            }
        }
        
        const isOwner = listing.seller && listing.seller._id === userId;
        const highestBidderName = listing.highestBidder ? listing.highestBidder.name : 'No bids yet';
        const winnerName = listing.winner ? listing.winner.name : 'N/A';

        let bidSectionHtml = '';
        if (listing.status === 'ended') {
            bidSectionHtml = `
                <div class="owner-notice">
                    <h3>Auction Ended</h3>
                    <p>Winner: <strong>${winnerName}</strong></p>
                    <p>Winning Bid: <strong>₹${listing.currentBid.toLocaleString()}</strong></p>
                </div>
            `;
        } else if (listing.status === 'pending') {
            bidSectionHtml = `
                <div class="owner-notice">
                    <h3>Auction Starts Soon</h3>
                    <p>Bidding will open at ${new Date(listing.startTime).toLocaleString()}.</p>
                </div>
            `;
        } else if (listing.status === 'active') {
            if (!isOwner) {
                bidSectionHtml = `
                    <form id="bid-form">
                        <h3>Place Your Bid</h3>
                        <div class="bid-input-group">
                            <input type="number" id="bid-amount" placeholder="Enter bid amount" required min="${listing.currentBid + 1}">
                            <button type="submit">Place Bid</button>
                        </div>
                    </form>
                `;
            } else { // isOwner
                bidSectionHtml = `
                    <div class="owner-notice">
                        <p>You cannot bid on your own listing.</p>
                    </div>
                `;
            }
        }

        auctionDetails.innerHTML = `
            <div class="auction-container">
                <div class="auction-image-column">
                    <img src="${listing.image}" alt="${listing.title}">
                </div>
                <div class="auction-details-column">
                    <h2 class="auction-title">${listing.title}</h2>
                    <p class="auction-description">${listing.description}</p>
                    <div class="auction-meta">
                        <span>Seller: <em>${listing.seller ? listing.seller.name : 'Unknown'}</em></span>
                        <span>Starts: <em>${new Date(listing.startTime).toLocaleString()}</em></span>
                        <span>Ends: <em>${new Date(listing.endTime).toLocaleString()}</em></span>
                    </div>
                    <div class="price-box">
                        <span class="price-label">${listing.status === 'ended' ? 'Winning Bid' : 'Current Bid'}</span>
                        <span class="price-value">₹${listing.currentBid.toLocaleString()}</span>
                        <span class="bidder-info">${listing.status === 'ended' ? 'Winner:' : 'Highest bid by:'} <strong>${listing.status === 'ended' ? winnerName : highestBidderName}</strong></span>
                    </div>
                    ${bidSectionHtml}
                </div>
            </div>
        `;
        
        if (listing.status === 'active' && !isOwner) {
            setupBidForm(id);
        }

    } catch (error) {
        console.error("Failed to load auction:", error);
        auctionDetails.innerHTML = `<p>Error loading auction details.</p>`;
    }
}

function setupAddListingForm() {
    const form = document.getElementById('addListingForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            alert('You must be logged in to create a listing.');
            window.location.href = 'login.html';
            return;
        }

        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const startPrice = document.getElementById('startPrice').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const imageFile = document.getElementById('image').files[0];

        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onloadend = async () => {
            const imageBase64 = reader.result;

            const res = await fetch(`${API_URL}/listings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, description, startPrice, startTime, endTime, image: imageBase64 })
            });

            const data = await res.json();
            const msgEl = document.getElementById('listingMsg');

            if (res.ok) {
                msgEl.textContent = 'Listing created successfully!';
                setTimeout(() => {
                    window.location.href = 'listings.html';
                }, 1500);
            } else {
                msgEl.textContent = `Error: ${data.message}`;
            }
        };
    });
}

function setupLogin() {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const loginToggle = document.getElementById("login-toggle");
    const signupToggle = document.getElementById("signup-toggle");
    const loginFormContainer = document.getElementById("login-form-container");
    const signupFormContainer = document.getElementById("signup-form-container");

    if (!loginForm || !signupForm) return;

    loginToggle.addEventListener("click", () => {
        loginFormContainer.style.display = "block";
        signupFormContainer.style.display = "none";
        loginToggle.classList.add("active");
        signupToggle.classList.remove("active");
    });

    signupToggle.addEventListener("click", () => {
        loginFormContainer.style.display = "none";
        signupFormContainer.style.display = "block";
        loginToggle.classList.remove("active");
        signupToggle.classList.add("active");
    });

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        const msgEl = document.getElementById("loginMsg");

        if (res.ok) {
            localStorage.setItem("token", data.token);
            window.location.href = 'listings.html';
        } else {
            msgEl.textContent = data.message;
        }
    });

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;

        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        const msgEl = document.getElementById("signupMsg");

        if (res.ok) {
            msgEl.textContent = "Signup successful! Please login.";
            // Switch to login form
            loginFormContainer.style.display = "block";
            signupFormContainer.style.display = "none";
            loginToggle.classList.add("active");
            signupToggle.classList.remove("active");
        } else {
            msgEl.textContent = data.message;
        }
    });
}

function setupBidForm(listingId) {
    const form = document.getElementById('bid-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('bid-amount').value;
        const token = localStorage.getItem('token');

        if (!token) {
            alert('Please login to place a bid.');
            window.location.href = 'login.html';
            return;
        }

        const res = await fetch(`${API_URL}/auctions/${listingId}/bids`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount })
        });

        if (res.ok) {
            loadAuction(listingId); // Refresh auction details
        } else {
            const err = await res.json();
            alert(`Error: ${err.message}`);
        }
    });
}

async function deleteListing(id) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to delete a listing.');
        return;
    }

    if (confirm('Are you sure you want to delete this listing?')) {
        const res = await fetch(`${API_URL}/listings/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            loadListings();
        } else {
            const data = await res.json();
            alert(`Error: ${data.message}`);
        }
    }
}

function setupEditListingForm(id) {
    const form = document.getElementById('editListingForm');
    if (!form) return;

    // Fetch existing listing data
    fetch(`${API_URL}/listings/${id}`)
        .then(res => res.json())
        .then(listing => {
            document.getElementById('title').value = listing.title;
            document.getElementById('description').value = listing.description;
            document.getElementById('startPrice').value = listing.startPrice;
            document.getElementById('startTime').value = new Date(listing.startTime).toISOString().slice(0, 16);
            document.getElementById('endTime').value = new Date(listing.endTime).toISOString().slice(0, 16);
        });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            alert('You must be logged in to edit a listing.');
            window.location.href = 'login.html';
            return;
        }

        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const startPrice = document.getElementById('startPrice').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        const res = await fetch(`${API_URL}/listings/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description, startPrice, startTime, endTime })
        });

        const data = await res.json();
        const msgEl = document.getElementById('listingMsg');

        if (res.ok) {
            msgEl.textContent = 'Listing updated successfully!';
            setTimeout(() => {
                window.location.href = 'listings.html';
            }, 1500);
        } else {
            msgEl.textContent = `Error: ${data.message}`;
        }
    });
}

/**
 * FarmTable — DOM manipulation examples (BIE5030)
 * Demonstrates 8+ DOM techniques with comments.
 */

function runDomExamples() {
  /* 1. querySelector — select first matching element */
  var heroTitle = document.querySelector('#hero-banner h2');
  if (heroTitle) {
    /* 2. textContent — read/set text without parsing HTML */
    console.log('[DOM] Hero title:', heroTitle.textContent);
  }

  /* 3. getElementById — fastest way to get element by id */
  var flashTimer = document.getElementById('flash-timer');
  if (flashTimer) {
    /* 8. style manipulation — direct CSS property changes */
    flashTimer.style.letterSpacing = '0.05em';
  }

  /* 4. querySelectorAll — select multiple elements */
  var filterBtns = document.querySelectorAll('#category-filters .filter-btn');
  filterBtns.forEach(function (btn, index) {
    /* 7. setAttribute / getAttribute / dataset */
    btn.setAttribute('data-index', String(index));
    btn.dataset.role = 'category-filter';

    /* 5. classList.add / remove / toggle */
    btn.addEventListener('mouseenter', function () {
      if (!btn.classList.contains('active')) {
        btn.classList.add('opacity-90');
      }
    });
    btn.addEventListener('mouseleave', function () {
      btn.classList.remove('opacity-90');
    });
  });

  /* 6. addEventListener — input event on search */
  var searchInput = document.querySelector('.navbar input[type="text"]');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      var query = e.target.value.trim().toLowerCase();
      if (query.length > 2) {
        console.log('[DOM] Search query:', query);
      }
    });
  }

  /* 9. createElement + appendChild — dynamic flash-sale dot indicator */
  var dotsContainer = document.querySelector('#hero-dots');
  if (dotsContainer && dotsContainer.children.length === 3) {
    var activeDot = dotsContainer.children[0];
    /* 10. DOM traversal — parentNode, children, nextElementSibling */
    var nextDot = activeDot.nextElementSibling;
    if (nextDot) {
      nextDot.addEventListener('click', function () {
        activeDot.classList.remove('bg-[#40916C]');
        activeDot.classList.add('bg-white/50');
        nextDot.classList.remove('bg-white/50');
        nextDot.classList.add('bg-[#40916C]');
      });
    }
  }

  /* 11. innerHTML — build HTML string and inject (used sparingly) */
  var demoBanner = document.getElementById('dom-demo-banner');
  if (demoBanner) {
    var notice = document.createElement('div');
    notice.className = 'text-[11px] text-[#40916C] mt-1';
    notice.textContent = 'DOM examples loaded ✓';
    demoBanner.appendChild(notice);

    /* 12. removeChild — cleanup after 5 seconds */
    setTimeout(function () {
      if (demoBanner.contains(notice)) {
        demoBanner.removeChild(notice);
      }
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', runDomExamples);

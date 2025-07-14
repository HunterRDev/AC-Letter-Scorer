document.addEventListener("DOMContentLoaded", function () {
	const MAX_CHARS = 192;
	const LETTER_BOX = document.getElementById('textInput');
	const CHAR_COUNTER_BOX = document.getElementById('charCounter');
	const SCORE_BOX = document.getElementById('letterScore');
	const CHECK_A_BOX = document.getElementById('checkABox');
	const CHECK_B_BOX = document.getElementById('checkBBox');
	const CHECK_C_BOX = document.getElementById('checkCBox');
	const CHECK_D_BOX = document.getElementById('checkDBox');
	const CHECK_E_BOX = document.getElementById('checkEBox');
	const CHECK_F_BOX = document.getElementById('checkFBox');
	const CHECK_G_BOX = document.getElementById('checkGBox');
	const TRIGRAM_BOX = document.getElementById('trigramBox');
	const LENGTH_BOX = document.getElementById('lengthBox');
	const MODAL_TRIGGER_TEXT = document.getElementById('trigger-text');
	const MODAL_BODY = document.getElementById('modal-overlay');
	const CLOSE_MODAL = document.getElementById('close-modal');
	let FETCH_RESULT = null;//Assigned at a later point in time when async context is available
	
	updateBoxDetails();

	// CHECK A - Punctuation
	async function checkA(input) {
		const PADDED_INPUT = input.padEnd(MAX_CHARS, ' ');
		const TRIMMED_INPUT = input.replace(/^[ \t]+|[ \t]+$/g, '');

		let score = 0;

		// +20pts if letter ends with punctuation, so long as letter is not 192 characters long
		if (TRIMMED_INPUT.length < MAX_CHARS && /[.?!]$/.test(TRIMMED_INPUT)) {
			score += 20;
		}

		let currentIndex = 0;

		while (currentIndex < PADDED_INPUT.length) {
		  const match = PADDED_INPUT.slice(currentIndex).match(/[.?!]/);
	
		  if (!match) {
			break; // exit loop if no punctuation mark is found
		  }
	
		  const PUNCT_INDEX = currentIndex + match.index;
		  const NEXT_THREE_CHARS = PADDED_INPUT.slice(PUNCT_INDEX + 1, PUNCT_INDEX + 4);
	
		  if (/^\s{3}$/.test(NEXT_THREE_CHARS)) {
			currentIndex = PUNCT_INDEX + 4; // skip and move to the next check if 3 spaces
			continue;
		  }
	
		  // find the first capital letter in the next three characters
		  const CAPITAL_MATCH = NEXT_THREE_CHARS.match(/[A-Z]/);
	
		  if (CAPITAL_MATCH) {
			score += 10;
			// update currentIndex to where the capital letter was found + 1
			currentIndex = PUNCT_INDEX + 1 + CAPITAL_MATCH.index + 1;
		  } else {
			score -= 10;
			// if no capital letter, proceed to the next three characters
			currentIndex = PUNCT_INDEX + 4;
		  }
		}

		return score;
	}

	async function onlyOneFetch() {
		//If not initialized initialize
		if(!FETCH_RESULT){
			// in-game trigram tables replicated via txt file
			let response = await fetch('Resources/trigrams-bugged.txt');
			if (!response.ok) {
				console.error("Error fetching trigrams file:", response.statusText);
				return 0;
			}
			FETCH_RESULT = await response.text();
		}
		return FETCH_RESULT;
	}

	// CHECK B - Trigrams
	async function checkB(input) {
		const PADDED_INPUT = input.padEnd(MAX_CHARS, ' ');

		let score = 0;
		let allTrigrams = await getAllTrigrams(PADDED_INPUT);

		let trigramTables = await onlyOneFetch();
		if (!trigramTables) {
			console.error("Trigrams file is empty or invalid.");
			return 0;
		}
		trigramTables = trigramTables.split('\n');

		let counter = 0;
		for (const TRIGRAM of allTrigrams) {
			if (TRIGRAM.length < 3) break;
			const firstChar = TRIGRAM[0].toUpperCase();
			const lookupKey = `~${firstChar}~`;

			let index = trigramTables.findIndex(line => line.startsWith(lookupKey));
			if (index === -1) continue;
			for (let j = index + 1; j < trigramTables.length; j++) {
				const line = trigramTables[j];
				// cause of bugged trigrams that replicates the in-game bug
				// change "continue" to "break" to fix
				if (line.startsWith('~')) continue;

				const finalTwo = TRIGRAM.slice(1, 3);
				if (line.includes(finalTwo)) {
					counter++;
					break;
				}
			}
		}
		// +3 pts per matching trigram
		score = counter * 3;
		return score;
	}

	// CHECK C - Leading Capital
	async function checkC() {
		const FIRST_CHAR = LETTER_BOX.value[0];
		let score = 0;

		// +20 pts if first letter is capital, -10 if not
		if (FIRST_CHAR) {
			if (/[A-Z]/.test(FIRST_CHAR)) {
				score += 20;
			}
			else {
				score -= 10;
			}
		}

		return score;
	}

	// CHECK D - Repeating Characters
	async function checkD(input) {
		const TRIMMED_INPUT = input.replace(/^[ \t]+|[ \t]+$/g, '');
		let score = 0;

		if (/([A-Za-z])\1\1/.test(TRIMMED_INPUT.replace(/ /g, ''))) {
			score -= 50;
		}

		return score;
	}

	// CHECK E - Space Ratio
	async function checkE(input) {
		const TRIMMED_INPUT = input.replace(/^[ \t]+|[ \t]+$/g, '');

		const NUM_SPACES = (TRIMMED_INPUT.match(/ /g) || []).length;
		const NUM_NON_SPACES = TRIMMED_INPUT.length - NUM_SPACES;
		const SPACE_RATIO = (NUM_SPACES * 100) / NUM_NON_SPACES;

		let score = 0;

		// +20 pts if num spaces > 20%
		if (SPACE_RATIO >= 20) {
			score += 20;
		} else {
			score -= 20;
		}

		return score;
	}

	// CHECK F - Run On Sentence
	async function checkF(input) {
		const TRIMMED_INPUT = input.replace(/^[ \t]+|[ \t]+$/g, '');
		const PUNCTUATION_REGEX = /[.?!]/g;
		const MATCHED_PUNCTUATION = [...TRIMMED_INPUT.matchAll(PUNCTUATION_REGEX)];

		let score = 0

		for (const PUNCTUATION of MATCHED_PUNCTUATION) {
			const PUNCTUATION_INDEX = PUNCTUATION.index;

			// check if there are at least 75 characters after the punctuation
			if (TRIMMED_INPUT.length - PUNCTUATION_INDEX > 75) {
				// check the next 75 characters for a long sequence without punctuation
				const GROUPING = input.substring(PUNCTUATION_INDEX + 1, PUNCTUATION_INDEX + 76);
				const PUNCUTATION_MISSING = /[^.?!]{75}/;
				// -150pts if no punctuation
				if (PUNCUTATION_MISSING.test(GROUPING)) {
					score -= 150;
				}
			}
		}

		return score;
	}

	// CHECK G - 32-Character Space Groupings
	async function checkG(input) {
		const TRIMMED_INPUT = input.replace(/^[ \t]+|[ \t]+$/g, '');
		const TOTAL_LENGTH = TRIMMED_INPUT.length;
		// find 32-char groupings
		const NUM_32_GROUPINGS = Math.floor(TOTAL_LENGTH / 32);

		let score = 0;

		// check each grouping for at least one space
		for (let i = 0; i < NUM_32_GROUPINGS; i++) {
			const GROUP = TRIMMED_INPUT.slice(i * 32, (i + 1) * 32);
			// -20 pts per group with no space
			if (!/ /.test(GROUP)) {
				score -= 20;
			}
		}

		return score;
	}

	// QUEST CHECK - Length
	function checkLength(input) {
		const TOTAL_NON_SPACE_CHAR = input.replace(/\s/g, '').length;
		if (TOTAL_NON_SPACE_CHAR >= 49) {
			return 2;
		}
		else if (TOTAL_NON_SPACE_CHAR >= 17) {
			return 1;
		}

		return 0;
	}

	// QUEST CHECK - Trigram
	function checkTrigram(input, trigramScore) {
		const TOTAL_NON_SPACE_CHAR = input.replace(/\s/g, '').length;
		const TOTAL_TRIGRAMS = getAllTrigrams(input).length;
		const VALID_TRIGRAMS = trigramScore / 3;
		const TRIGRAM_PERCENTAGE = (VALID_TRIGRAMS * 10000) / (TOTAL_TRIGRAMS * 100);
		const RUN_ON = getRunOn(input);

		if (TOTAL_TRIGRAMS < 3) {
			if (TOTAL_NON_SPACE_CHAR < 5) {
				return 0;
			}
			else if (RUN_ON) {
				return 0;
			}
		}
		else if (TRIGRAM_PERCENTAGE >= 30) {
			return 3;
		}
		else if (RUN_ON) {
			return 0;
		}

		return 3;
	}

	function getRunOn(input) {
		// disgusting regex that tracks repeating, sequential characters
		const GROSS_REGEX = /([^"!_\-\u1F4A2%@\u00B7])\1{2,}|(["!_\-\u1F4A2%@\u00B7])\2{7,}/;
		return GROSS_REGEX.test(input);
	}

	function getAllTrigrams(input) {
		let trigrams = [];
		let i = 0;
		while (i < input.length) {
			while (i < input.length && /[\s.,!?]/.test(input[i])) {
				i++;
			}

			if (i < input.length) {
				trigrams.push(input.slice(i, i + 3));

				while (i < input.length && !/[\s.,!?]/.test(input[i])) {
					i++;
				}
			}
		}
		return trigrams;
	}

	async function calculateScore(input) {
		let checkAScore = await checkA(input);
		let checkBScore = await checkB(input);
		let checkCScore = await checkC();
		let checkDScore = await checkD(input);
		let checkEScore = await checkE(input);
		let checkFScore = await checkF(input);
		let checkGScore = await checkG(input);

		updateCheckBox(CHECK_A_BOX, checkAScore);
		updateCheckBox(CHECK_B_BOX, checkBScore);
		updateCheckBox(CHECK_C_BOX, checkCScore);
		updateCheckBox(CHECK_D_BOX, checkDScore);
		updateCheckBox(CHECK_E_BOX, checkEScore);
		updateCheckBox(CHECK_F_BOX, checkFScore);
		updateCheckBox(CHECK_G_BOX, checkGScore);

		return checkAScore + checkBScore + checkCScore + checkDScore + checkEScore + checkFScore + checkGScore;
	}

	function updateCheckBox(box, score) {
		box.textContent = score > 0 ? `+${score} pts` : `${score} pts`;
		if (score == 0) {
			box.className = 'neutral';
		}
		else {
			box.className = score > 0 ? 'positive' : 'negative';
		}
	}

	function updateRankBox(box, rank) {
		box.textContent = rank > 0 ? `+${rank} rank` : `${rank} rank`;
		if (rank == 0) {
			box.className = 'neutral';
		}
		else {
			box.className = rank > 0 ? 'positive' : 'negative';
		}
	}

	function updateReplyMessage(score) {
		const PRESENT_ATTACHED = document.querySelector('#present-attached').checked;

		let friendship = 3;
		if (PRESENT_ATTACHED) {
			friendship += 3;
		}

		if (score >= 100) {
			replyMessage.innerHTML = `<b>Villager will send a favorable reply!</b> <br> 50% chance of receiving a random clothing/furniture item! <br> +${friendship} friendship with villager`;
			replyMessage.className = "positive";
		} else if (score < 50) {
			if (PRESENT_ATTACHED) {
				replyMessage.innerHTML = `<b>Villager will send a negative reply...</b> <br> <span style="color: green"> +1 friendship with villager</span>`;
			}
			else {
				replyMessage.innerHTML = `<b>Villager will send a negative reply...</b> <br> -2 friendship with villager`;
			}
			replyMessage.className = "negative";
		} else {
			replyMessage.innerHTML = `<b>Villager will not send a reply...</b> <br> <span style="color: green"> +${friendship} friendship with villager</span>`;
			replyMessage.className = "neutral";
		}
	}

	async function updateBoxDetails() {
		const LETTER_BODY = LETTER_BOX.value;
		const CHAR_COUNT = LETTER_BODY.length;
		const PRESENT_ATTACHED = document.querySelector('#present-attached').checked;
		const IS_QUEST_LETTER = document.querySelector('#is-quest-letter').checked;
		const TRIGRAM_SCORE = await checkB(LETTER_BODY)
		const LETTER_SCORE = await calculateScore(LETTER_BODY);

		// --- quest letter ranking, outsource this to a function prob ---
		const TRIGRAM_RANK = checkTrigram(LETTER_BODY, TRIGRAM_SCORE);
		updateRankBox(TRIGRAM_BOX, TRIGRAM_RANK);

		const LENGTH_RANK = checkLength(LETTER_BODY);
		updateRankBox(LENGTH_BOX, LENGTH_RANK);

		let presentRank = 0;
		if (PRESENT_ATTACHED) {
			presentRank = 6;
		}
		updateRankBox(presentBox, presentRank);

		const LETTER_RANK = TRIGRAM_RANK + LENGTH_RANK + presentRank;

		if (IS_QUEST_LETTER) {
			SCORE_BOX.textContent = `Letter Rank: ${LETTER_RANK}`;

			let presentText = "";
			switch (LETTER_RANK) {
				case 3:
				case 7:
					presentText = "a random clothing item";
					break;
				case 4:
					presentText = "a random furniture item";
					break;
				case 5:
					presentText = "a random carpet or a random wallpaper";
					break;
				case 6:
					presentText = "your native fruit";
					break;
				case 8:
					presentText = "a rare clothing item";
					break;
				case 9:
					presentText = "a random, non-native fruit";
					break;
				case 10:
					presentText = "a rare furniture item";
					break;
				case 11:
					presentText = "a rare carpet or rare wallpaper";
					break;
			}

			if (LETTER_RANK >= 3) {
				replyMessage.innerHTML = `Villager response letter will include <br /> <b>${presentText}</b> !`;
				replyMessage.className = "positive";
			}
			else {
				replyMessage.innerHTML = `Villager response letter will not include a present... <br /><br />`;
				replyMessage.className = "neutral";
			}
			// --- end quest letter ranking --
		} else {
			SCORE_BOX.textContent = `Letter Score: ${LETTER_SCORE} pts`;
			updateReplyMessage(LETTER_SCORE);
		}
		CHAR_COUNTER_BOX.textContent = `Characters: ${CHAR_COUNT} / ${MAX_CHARS}`;
	}

	// --- HTML interfacing ---
	LETTER_BOX.addEventListener('input', async function () {
		updateBoxDetails();
	});
	MODAL_TRIGGER_TEXT.addEventListener('click', () => {
		MODAL_BODY.style.display = 'flex';
	});
	CLOSE_MODAL.addEventListener('click', () => {
		MODAL_BODY.style.display = 'none';
	});
	MODAL_BODY.addEventListener('click', (event) => {
		if (event.target === MODAL_BODY) {
			MODAL_BODY.style.display = 'none';
		}
	});
	document.querySelector('#is-quest-letter').addEventListener('change', function () {
		updateBoxDetails();
	});
	document.querySelector('#present-attached').addEventListener('change', function () {
		updateBoxDetails();
	});
	document.querySelector('.collapsible').addEventListener('click', function () {
		const CONTENT_BOX = document.querySelector('.content');
		const QUEST_CONTENT_BOX = document.querySelector('.quest-content');
		const ARROW = document.querySelector('.arrow');
		const IS_QUEST_CHECKED = document.getElementById('is-quest-letter').checked;

		if (IS_QUEST_CHECKED) {
			if (QUEST_CONTENT_BOX.style.display === 'block') {
				QUEST_CONTENT_BOX.style.display = 'none';
				ARROW.classList.remove('down');
			} else {
				QUEST_CONTENT_BOX.style.display = 'block';
				ARROW.classList.add('down');
			}
		}
		else {
			if (CONTENT_BOX.style.display === 'block') {
				CONTENT_BOX.style.display = 'none';
				ARROW.classList.remove('down');
			} else {
				CONTENT_BOX.style.display = 'block';
				ARROW.classList.add('down');
			}
		}

	});
	document.querySelector('#is-quest-letter').addEventListener('change', function () {
		const IS_QUEST_CHECKED = this.checked;
		const CONTENT_BOX = document.querySelector('.content');
		const QUEST_CONTENT_BOX = document.querySelector('.quest-content');
		const LETTER_SCORING_BOXES = document.querySelector('.letter-scoring');
		const LETTER_RANKING_BOXES = document.querySelector('.ranking-calculation');

		if (IS_QUEST_CHECKED) {
			if (CONTENT_BOX.style.display == 'block') {
				CONTENT_BOX.style.display = 'none';
				QUEST_CONTENT_BOX.style.display = 'block';
			}
			LETTER_SCORING_BOXES.style.display = 'none';
			LETTER_RANKING_BOXES.style.display = 'table';
		} else {
			if (QUEST_CONTENT_BOX.style.display == 'block') {
				QUEST_CONTENT_BOX.style.display = 'none';
				CONTENT_BOX.style.display = 'block';
			}
			LETTER_SCORING_BOXES.style.display = 'table';
			LETTER_RANKING_BOXES.style.display = 'none';
		}
	});
});

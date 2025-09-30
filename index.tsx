/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {GoogleGenAI} from '@google/genai';

interface Flashcard {
  term: string;
  definition: string;
}

const topicInput = document.getElementById('topicInput') as HTMLTextAreaElement;
const generateButton = document.getElementById(
  'generateButton',
) as HTMLButtonElement;
const flashcardsContainer = document.getElementById(
  'flashcardsContainer',
) as HTMLDivElement;
const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

function renderFlashcards(flashcards: Flashcard[]) {
  flashcardsContainer.textContent = '';
  flashcards.forEach((flashcard, index) => {
    // Create card structure for flipping
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('flashcard');
    cardDiv.dataset['index'] = index.toString();
    cardDiv.setAttribute('role', 'button');
    cardDiv.setAttribute('aria-pressed', 'false');
    cardDiv.setAttribute('tabindex', '0');

    const cardInner = document.createElement('div');
    cardInner.classList.add('flashcard-inner');

    const cardFront = document.createElement('div');
    cardFront.classList.add('flashcard-front');

    const termDiv = document.createElement('div');
    termDiv.classList.add('term');
    termDiv.textContent = flashcard.term;

    const cardBack = document.createElement('div');
    cardBack.classList.add('flashcard-back');

    const definitionDiv = document.createElement('div');
    definitionDiv.classList.add('definition');
    definitionDiv.textContent = flashcard.definition;

    cardFront.appendChild(termDiv);
    cardBack.appendChild(definitionDiv);
    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    cardDiv.appendChild(cardInner);

    flashcardsContainer.appendChild(cardDiv);

    const flipCard = () => {
      const isFlipped = cardDiv.classList.toggle('flipped');
      cardDiv.setAttribute('aria-pressed', isFlipped.toString());
    };

    // Add click listener to toggle the 'flipped' class
    cardDiv.addEventListener('click', flipCard);
    cardDiv.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        flipCard();
        event.preventDefault();
      }
    });
  });
}

generateButton.addEventListener('click', async () => {
  const input = topicInput.value.trim();
  if (!input) {
    errorMessage.textContent =
      'Please enter a topic or some terms and definitions.';
    flashcardsContainer.textContent = '';
    return;
  }

  flashcardsContainer.textContent = '';
  generateButton.disabled = true;

  // Heuristic to check if input is a list of term: definition pairs
  const isTermDefinitionList = input.includes('\n') && input.includes(':');

  try {
    let responseText = '';
    if (isTermDefinitionList) {
      errorMessage.textContent = 'Parsing flashcards...';
      responseText = input;
    } else {
      errorMessage.textContent = 'Generating flashcards...';
      const prompt = `Generate a list of flashcards for the topic of "${input}". Each flashcard should have a term and a concise definition. Format the output as a list of "Term: Definition" pairs, with each pair on a new line. Ensure terms and definitions are distinct and clearly separated by a single colon. Here's an example output:
Hello: Hola
Goodbye: Adiós`;
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      responseText = result?.text ?? '';
    }

    if (responseText) {
      const flashcards: Flashcard[] = responseText
        .split('\n')
        .map((line) => {
          const parts = line.split(':');
          if (parts.length >= 2 && parts[0].trim()) {
            const term = parts[0].trim();
            const definition = parts.slice(1).join(':').trim();
            if (definition) {
              return {term, definition};
            }
          }
          return null;
        })
        .filter((card): card is Flashcard => card !== null);

      if (flashcards.length > 0) {
        errorMessage.textContent = '';
        renderFlashcards(flashcards);
      } else {
        errorMessage.textContent =
          'No valid flashcards could be generated. Please check the format.';
      }
    } else if (!isTermDefinitionList) {
      errorMessage.textContent =
        'Failed to generate flashcards or received an empty response. Please try again.';
    }
  } catch (error: unknown) {
    console.error('Error generating content:', error);
    const detailedError =
      (error as Error)?.message || 'An unknown error occurred';
    errorMessage.textContent = `An error occurred: ${detailedError}`;
  } finally {
    generateButton.disabled = false;
  }
});

window.addEventListener('DOMContentLoaded', () => {
  // If the textarea is pre-filled, automatically generate cards on load.
  if (topicInput.value.trim()) {
    generateButton.click();
  }
});

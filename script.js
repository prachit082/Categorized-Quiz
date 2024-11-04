document.addEventListener('DOMContentLoaded', () => {
    const questionContainer = document.getElementById('question');
    const answersContainer = document.getElementById('answers');
    const resultContainer = document.getElementById('result');
    const progressContainer = document.getElementById('progress');
    const currentScoreDisplay = document.getElementById('currentScore');
    const highScoreDisplay = document.getElementById('highScore');
    const gameSetupDiv = document.getElementById('game-setup');
    const quizDiv = document.getElementById('quiz');
    const categorySelect = document.getElementById('category');
    const amountInput = document.getElementById('amount');
    const difficultySelect = document.getElementById('difficulty');
    const startButton = document.getElementById('start-btn');

    let currentQuestions = [];
    let score = 0;
    let questionIndex = 0;
    let highScore = parseInt(localStorage.getItem('HighScoreTrivia')) || 0;
    let questionStartTime;
    const baseScorePerQuestion = 1000;
    const penaltyPerSecond = 10;

    highScoreDisplay.innerText = `High Score: ${highScore}`;

    /**
     * Fetches trivia categories from the Open Trivia Database API and populates a select element with the categories.
     * 
     * This function sends a GET request to the 'https://opentdb.com/api_category.php' endpoint to retrieve a list of trivia categories.
     * Upon receiving the response, it parses the JSON data and iterates through the categories.
     * For each category, it creates an <option> element, sets its value to the category ID, and its text content to the category name.
     * Finally, it appends the <option> element to the categorySelect element.
     * 
     * @returns {void}
     */
    function fetchCategories() {
        fetch('https://opentdb.com/api_category.php').then(response => response.json()).then(data => {
            data.trivia_categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        });
    }

    /**
     * Initializes the quiz game by fetching questions based on the selected category, amount, and difficulty.
     * Hides the game setup screen and displays the quiz screen.
     */
    function startGame() {
        const category = categorySelect.value;
        const amount = amountInput.value;
        const difficulty = difficultySelect.value;
        fetchQuestions(amount, category, difficulty);
        gameSetupDiv.style.display = 'none';
        quizDiv.style.display = 'block';
    }

    /**
     * Fetches quiz questions from the Open Trivia Database API.
     *
     * @param {number} amount - The number of questions to fetch.
     * @param {number} [category] - The category ID of the questions (optional).
     * @param {string} [difficulty] - The difficulty level of the questions (optional). Can be 'easy', 'medium', or 'hard'.
     * @returns {void}
     */
    function fetchQuestions(amount, category, difficulty) {
        let url = `https://opentdb.com/api.php?amount=${amount}`;
        if (category) url += `&category=${category}`;
        if (difficulty) url += `&difficulty=${difficulty}`;
        url += `&type=multiple`;

        fetch(url).then(response => response.json()).then(data => {
            currentQuestions = data.results;
            questionIndex = 0;
            score = 0;
            displayQuestion();
        }).catch(error => alert('Error:' + error));
    }

    /**
     * Displays the current question and its possible answers.
     * If there are no more questions, updates the high score and shows the results.
     *
     * @function
     * @name displayQuestion
     */
    function displayQuestion() {
        if (questionIndex < currentQuestions.length) {
            let currentQuestion = currentQuestions[questionIndex];
            questionContainer.innerHTML = decodeHTML(currentQuestion.question);
            displayAnswers(currentQuestion);
            updateProgress();
            questionStartTime = Date.now();
        } else {
            updateHighScore();
            showResults();
        }
    }

    /**
     * Displays the possible answers for a given question.
     * Clears the current answers in the container, shuffles the answers,
     * and creates a button for each answer.
     * 
     * @param {Object} question - The question object containing the correct and incorrect answers.
     * @param {string[]} question.incorrect_answers - Array of incorrect answers.
     * @param {string} question.correct_answer - The correct answer.
     */
    function displayAnswers(question) {
        answersContainer.innerHTML = '';
        const answers = [...question.incorrect_answers, question.correct_answer];
        shuffleArray(answers);

        answers.forEach(answer => {
            const button = document.createElement('button');
            button.innerHTML = decodeHTML(answer);
            button.className = 'answer-btn';
            button.addEventListener('click', () => selectAnswer(button, question.correct_answer, answers));
            answersContainer.appendChild(button);
        });
    }

    /**
     * Handles the selection of an answer in a quiz, updates the score, and provides feedback.
     *
     * @param {HTMLElement} selectedButton - The button element that was selected by the user.
     * @param {string} correctAnswer - The correct answer for the current question.
     * @param {Array<string>} answers - An array of all possible answers for the current question.
     */
    function selectAnswer(selectedButton, correctAnswer, answers) {
        const timeTaken = (Date.now() - questionStartTime) / 1000;
        let scoreForThisQuestion = Math.max(baseScorePerQuestion - Math.floor(timeTaken) * penaltyPerSecond, 0);

        disableButtons();
        let correctButton;
        answers.forEach(answer => {
            if (decodeHTML(answer) === decodeHTML(correctAnswer)) {
                correctButton = [...answersContainer.childNodes].find(button => button.innerHTML === decodeHTML(correctAnswer));
            }
        });

        if (decodeHTML(selectedButton.innerHTML) === decodeHTML(correctAnswer)) {
            score += scoreForThisQuestion;
            selectedButton.classList.add('correct');
            resultContainer.innerText = `Correct! + ${scoreForThisQuestion} Points`;
        } else {
            selectedButton.classList.add('incorrect');
            correctButton.classList.add('correct');
            resultContainer.innerText = `Wrong! The correct answer was: ${decodeHTML(correctAnswer)}`;
        }

        updateCurrentScore();
        setTimeout(() => {
            questionIndex++;
            displayQuestion();
            resultContainer.innerText = '';
        }, 3000);
    }

    function updateCurrentScore() {
        currentScoreDisplay.innerText = `Current Score: ${score}`;
    }

    function disableButtons() {
        const buttons = answersContainer.getElementsByClassName('answer-btn');
        for (let button of buttons) {
            button.disabled = true;
        }
    }

    /**
     * Displays the final results of the quiz.
     * 
     * This function updates the UI to show that the quiz is finished, displays the final score,
     * and provides a button to restart the quiz. It also clears the answers and progress containers,
     * and updates the high score display.
     */
    function showResults() {
        questionContainer.innerText = 'Quiz Finished!';
        answersContainer.innerHTML = '';
        resultContainer.innerText = `Your final score is ${score}`;
        updateHighScoreDisplay();
        progressContainer.innerText = '';
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart Quiz';
        restartButton.addEventListener('click', () => {
            quizDiv.style.display = 'none';
            gameSetupDiv.style.display = 'block';
            fetchCategories();
        });
        answersContainer.appendChild(restartButton);
    }

    /**
     * Updates the high score if the current score is greater than the stored high score.
     * The new high score is saved to local storage and the high score display is updated.
     */
    function updateHighScore() {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('HighScoreTrivia', highScore.toString());
            updateHighScoreDisplay();
        }
    }

    function updateHighScoreDisplay() {
        highScoreDisplay.innerText = `High Score: ${highScore}`;
    }

    function updateProgress() {
        progressContainer.innerText = `Question ${questionIndex + 1}/${currentQuestions.length}`;
    }

    /**
     * Shuffles the elements of an array in place using the Fisher-Yates algorithm.
     *
     * @param {Array} array - The array to shuffle.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function decodeHTML(html) {
        var txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    startButton.addEventListener('click', startGame);

    fetchCategories();

});

import { ArrowRightIcon, CheckCircledIcon, CrossCircledIcon, ExitIcon } from "@modulz/radix-icons";
import axios from "axios";
import PropTypes from "prop-types";
import React, { Component, useState } from "react";

import ButtonCircle from "../components/buttons/ButtonCircle";
import ButtonDefault from "../components/buttons/ButtonDefault";
import Answers from "../components/quiz/Answers";
import Filters from "../components/quiz/Filters";
import Question from "../components/quiz/Question";
import Timer from "../components/quiz/Timer";
import PageError from "../components/status/PageError.jsx";
import InformationPilette from "../images/information_crop.png";

/* ---------- Introduction view ---------- */

const IntroductionView = ({ onClick }) => {
  const [system, setSystem] = useState("null");
  const [difficulty, setDifficulty] = useState(0);

  const changeSystem = (event) => setSystem(event.target.value);
  const changeDifficulty = (event) => {
    setDifficulty(parseInt(event.target.value));
    setSystem("null");
  };

  return (
    <>
      <img src={InformationPilette} alt="Pilette se concentre avant l'entraînement" />
      <div>
        <h1>Mode entraînement</h1>
        <p id="about">Répondez à une série de questions aléatoire.</p>
        <Filters
          difficulty={difficulty}
          changeDifficulty={changeDifficulty}
          changeSystem={changeSystem}
        />
      </div>
      <ButtonDefault onClick={() => onClick(system, difficulty)}>
        Lancer l'entraînement
      </ButtonDefault>
    </>
  );
};

IntroductionView.propTypes = {
  onClick: PropTypes.func.isRequired,
};

/* ---------- Play view ---------- */

class PlayView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      inProgress: true,
      lastClicked: "",
      timer: props.question.timerDuration,
    };
  }

  /**
   * Update the timer
   * @param {number} value New timer value
   */
  updateTimer = (value) => {
    let { inProgress } = this.state;

    if (!inProgress) return false;
    if (value === 0) {
      this.props.addUserAnswer(this.props.question.type, this.props.question.wording, null);
      inProgress = false;
    }

    this.setState({
      inProgress: inProgress,
      timer: value,
    });
  };

  /**
   * Handle a click on an answer button
   * @param {string} value The clicked answer
   */
  handleAnswerClick = (value) => {
    if (!this.state.inProgress) return;
    this.props.addUserAnswer(this.props.question.type, this.props.question.wording, value);
    this.setState({
      inProgress: false,
      lastClicked: value,
    });
  };

  /**
   * Get the next question
   */
  nextQuestion = () => {
    this.props.getNewQuestion();
  };

  componentDidUpdate(prevProps) {
    if (this.props.questionNum !== prevProps.questionNum) {
      this.setState({
        inProgress: true,
        lastClicked: "",
        timer: this.props.question.timerDuration,
      });
    }
  }

  render() {
    const { inProgress, lastClicked, timer } = this.state;
    const { result, questionNum, question, displaySummury } = this.props;

    return (
      <>
        <div id="quiz-topbar">
          <div>
            <span id="score-good">
              <CheckCircledIcon /> {result.good.length}
            </span>
            <span id="score-bad">
              <CrossCircledIcon /> {result.bad.length}
            </span>
          </div>
          <div>
            <button onClick={displaySummury}>
              <ExitIcon /> Terminer
            </button>
          </div>
        </div>

        <Question
          numero={questionNum}
          text={question.wording}
          image={question.type === 11 ? question.subject : null}
        />

        {inProgress ? (
          <Timer inProgress={inProgress} duration={timer} updateParent={this.updateTimer} />
        ) : (
          <div id="next-btn">
            <ButtonCircle onClick={this.nextQuestion}>
              <ArrowRightIcon />
            </ButtonCircle>
          </div>
        )}

        <Answers
          inProgress={inProgress}
          goodAnswerIndex={question.goodAnswer}
          answers={question.answers}
          lastClicked={lastClicked}
          onClick={this.handleAnswerClick}
          areImage={question.type === 12}
        />
      </>
    );
  }
}

PlayView.propTypes = {
  result: PropTypes.object.isRequired,
  question: PropTypes.object.isRequired,
  getNewQuestion: PropTypes.func.isRequired,
  addUserAnswer: PropTypes.func.isRequired,
  displaySummury: PropTypes.func.isRequired,
  questionNum: PropTypes.number.isRequired,
};

/* ---------- Summury view ---------- */

const SummaryView = ({ result }) => {
  return (
    <>
      <h1>Résultat</h1>
      <p>
        Votre score : {result.good.length}/{result.good.length + result.bad.length}
      </p>

      <details>
        <summary>Les bonnes réponses</summary>
        <ul>
          {result.good.length === 0 ? (
            <li key={0}>Aucune bonne réponse.</li>
          ) : (
            <>
              {result.good.map((value, index) => (
                <li key={index}>
                  <p>{value.question}</p>
                  <p>{value.userChoice}</p>
                </li>
              ))}
            </>
          )}
        </ul>
      </details>

      <h2>Les erreurs</h2>
      <ul>
        {result.bad.length === 0 ? (
          <li key={0}>Aucune mauvaise réponse.</li>
        ) : (
          <>
            {result.bad.map((value, index) => (
              <li key={index}>
                <p>{value.question}</p>
                <p>
                  <span>{value.userChoice}</span>
                  <span>
                    <ArrowRightIcon />
                  </span>
                  <span>{value.goodChoice}</span>
                </p>
              </li>
            ))}
          </>
        )}
      </ul>
    </>
  );
};

SummaryView.propTypes = {
  result: PropTypes.shape({
    good: PropTypes.array.isRequired,
    bad: PropTypes.array.isRequired,
  }).isRequired,
};

/* ---------- Train ---------- */

class Train extends Component {
  constructor(props) {
    super(props);
    this.state = {
      gameState: Train.STATE_INTRO,
      question: { answers: [], goodAnswerIndex: -1, subject: "", type: 0 },
      result: { good: [], bad: [] },
      error: null,
      questionNum: 0,
      system: null,
      difficulty: null,
    };
  }

  /**
   * Get a new question (random type) from the server
   * @param {number} nthRetry The number of attempts
   * @param {Array} unavailableTypes Previous unavaible Types tested on attempts
   */
  getNewQuestion = (nthRetry = 0, unavailableTypes = []) => {
    const minQuestionType = 1,
      maxQuestionType = 12;
    let questionType =
      Math.floor(Math.random() * (maxQuestionType + 1 - minQuestionType)) + minQuestionType;
    while (unavailableTypes.toString().indexOf(questionType) !== -1) {
      questionType =
        Math.floor(Math.random() * (maxQuestionType + 1 - minQuestionType)) + minQuestionType;
    }
    unavailableTypes.push(questionType.toString());
    axios
      .get(`/api/v1/question/${questionType}`, {
        params: {
          system: this.state.system,
          difficulty: this.state.difficulty,
        },
      })
      .then(({ data: question }) => {
        this.setState({
          gameState: Train.STATE_PLAY,
          question,
          inProgress: true,
          lastClicked: "",
          error: null,
          questionNum: this.state.questionNum + 1,
        });
      })
      .catch((error) => {
        if (error.response?.status === 422 && nthRetry < 10) {
          this.getNewQuestion(nthRetry + 1, unavailableTypes);
          return;
        }
        console.error(error);
        this.setState({
          error: "Impossible de récupérer les données depuis le serveur.",
        });
      });
  };

  /**
   * Add the question and the answer to the list of results
   * @param {number} type The question's type
   * @param {string} question The question text
   * @param {string} userChoice The user's answer
   */
  addUserAnswer = (type, question, userChoice) => {
    const { good, bad } = this.state.result;
    const { answers, goodAnswer } = this.state.question;
    let rightAnswer = answers[goodAnswer];

    if (type === 12) {
      if (userChoice != null) userChoice = userChoice.split("/")[5].split(".")[0];
      rightAnswer = rightAnswer.split("/")[5].split(".")[0];
    }

    if (userChoice === rightAnswer) {
      good.push({ question: question, userChoice: userChoice });
    } else {
      bad.push({ question: question, userChoice: userChoice, goodChoice: rightAnswer });
    }
    this.setState({
      result: { good: good, bad: bad },
    });
  };

  /**
   * Change the state of the game to display the summury
   */
  displaySummury = () => {
    this.setState({
      gameState: Train.STATE_SUMMARY,
    });
  };

  /**
   * Change the main component according to the state of the game
   */
  switchComponent() {
    switch (this.state.gameState) {
      case Train.STATE_INTRO:
        return (
          <IntroductionView
            onClick={(systemF, difficultyF) => {
              this.setState({ system: systemF, difficulty: difficultyF }, () =>
                this.getNewQuestion()
              );
            }}
          />
        );
      case Train.STATE_PLAY:
        return (
          <PlayView
            result={this.state.result}
            question={this.state.question}
            getNewQuestion={this.getNewQuestion}
            addUserAnswer={this.addUserAnswer}
            displaySummury={this.displaySummury}
            questionNum={this.state.questionNum}
          />
        );
      case Train.STATE_SUMMARY:
        return <SummaryView result={this.state.result} />;
      default:
        return <pre>Error</pre>;
    }
  }

  render() {
    const { gameState, error } = this.state;
    let additionalClass = "";
    if (gameState === Train.STATE_INTRO) {
      additionalClass = "quiz-intro";
    } else if (gameState === Train.STATE_SUMMARY) {
      additionalClass = "quiz-summary";
    }

    return (
      <main id="quiz" className={additionalClass}>
        {error !== null ? <PageError message={error} /> : this.switchComponent()}
      </main>
    );
  }
}

Train.STATE_INTRO = 0;
Train.STATE_PLAY = 1;
Train.STATE_SUMMARY = 2;

Train.TIMER_DURATION = 10;

export default Train;

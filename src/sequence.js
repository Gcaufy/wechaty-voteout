const _makeDelay = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

// Run promises in sequence, with a delay between them
// p1 -> delay -> p2 -> delay
function runSequenceWithDelay(promises, delay) {
  const newPromise = [];
  promises.forEach((p, i) => {
    newPromise.push(p);
    if (i !== promises.length - 1) {
      newPromise.push(() => _makeDelay(delay));
    }
  });
  return runSequence(newPromise);
}

// Run promise in sequence
// p1 -> p2 -> p3
function runSequence(promises) {
  let count = 0;
  let results = [];

  const iterateeFunc = (previousPromise, currentPromise) => {
    return previousPromise
      .then(function (result) {
        if (count++ !== 0) results.push(result);
        return currentPromise(result, results, count);
      })
  }

  return promises
  // this call allows the last promises's resolved result to be obtained cleanly
  .concat(() => Promise.resolve())
  // reduce() concatenates the promises. E.g. p1.then(p2).then(p3)
  .reduce(iterateeFunc, Promise.resolve(false))
  .then(() => results)
}

module.exports = {
  runSequence,
  runSequenceWithDelay,
};

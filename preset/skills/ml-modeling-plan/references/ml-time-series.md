# ml-time-series — time-ordered data, done without leaking

Reference for `ml-modeling-plan`. Read whenever the row order carries information.

**The one rule:** in time-ordered data, **never shuffle**. Random splits leak the future into training, and
the resulting scores are meaningless. Almost every other mistake in this file is a variation of that one.

---

## 1. Splitting and validation

| Method | When | Why |
|---|---|---|
| **Rolling-origin / walk-forward validation** | default | train on the past, validate on the next window, then roll forward. Mirrors deployment. |
| **Growing vs sliding window** | choose deliberately | growing = more data per fit; sliding = adapts to regime change. State which you used. |
| Hold-out final period | always | the last contiguous block is touched **once**, at the end. |
| Random k-fold | **never** | leaks future into past. |

Report the split boundaries explicitly (dates or indices). A time-series result without stated boundaries is
not reproducible.

## 2. Features — where the leakage actually happens

- **Every lag must be strictly in the past** relative to the prediction time. An off-by-one in the lag
  construction is the single most common leak and produces excellent, fake accuracy.
- **Rolling statistics must exclude the current point** (shift before rolling). `df.rolling(7).mean()`
  including today is a leak.
- **Exogenous variables must be known at prediction time.** A feature only observed afterwards (a
  measurement taken at the end of the period, a corrected figure) is future information.
- **Target encoding must use past data only** — fit it inside the walk-forward fold.
- **Seasonality**: cyclical encodings for calendar features; or explicit seasonal terms. Raw timestamp
  integers impose a false ordinal scale.
- **Horizon matters**: features and validation must match the horizon you will actually forecast. Validating
  a 1-step model and deploying a 12-step forecast is a different problem.

## 3. Stationarity and differencing

- Check for trend and seasonality before modelling. A tree ensemble **cannot extrapolate** a trend — it will
  plateau at the training range. If the target trends, model the difference or detrend explicitly.
- Differencing makes a series closer to stationary but loses level information; keep the level if the
  absolute value matters.
- After modelling, check residual autocorrelation: structure left in residuals means the model is
  underfitting, not that the data is noisy.

## 4. Evaluation for time series

- Report error **per horizon**, not only averaged across horizons — a model can be good at h=1 and useless
  at h=12. Averaging hides exactly the failure that matters.
- Report against the **naive baselines**: last value (persistence), seasonal last value, and the mean. These
  are strong baselines and are frequently beaten by "sophisticated" models only on paper.
- Prefer scale-aware or scale-free metrics appropriate to the range; RMSE is dominated by the largest values,
  which are often the least important.
- Give an interval (across folds or seeds). A single walk-forward pass is one number.

## 5. Underfit / overfit in this setting

**Overfit signature.** In-sample fit excellent, out-of-sample poor; validation error rises as lags are
added; the model has effectively memorised the last observation.

**Levers.** Reduce lag count (each lag must earn its place); shrink the window; regularise the lag-feature
model as in `ml-overfit-underfit.md` §1–§2; simplify seasonality.

**Underfit signature.** Predictions collapse to the mean or the previous value; residuals retain
autocorrelation.

**Levers.** Add seasonal or exogenous structure; extend memory; check that stationarity handling has not
removed the signal.

## 6. Checklist

- [ ] Split is walk-forward with stated boundaries; last block touched once.
- [ ] Lags and rolling statistics are strictly past-only (shifted).
- [ ] Exogenous features are known at prediction time.
- [ ] Horizon of validation matches the deployment horizon.
- [ ] Naive baselines (persistence, seasonal persistence, mean) reported.
- [ ] Error reported per horizon.
- [ ] Residual autocorrelation checked.
- [ ] Interval reported across folds or seeds.

## 7. What this reference does not claim

- It does not rank forecasting model families. The choice depends on horizon, seasonality, and the cost
  structure.
- It contains no measured numbers from this project: no time-series dataset was analysed here, so every
  statement is standard practice (`JUDGEMENT`), except the leakage mechanics, which are structural.

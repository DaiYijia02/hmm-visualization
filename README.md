# HMM Visualization Dashboard

An interactive dashboard for analyzing Hidden Markov Model (HMM) performance across different language models and experimental configurations.

## 🎯 HMM Analysis Dashboard

The **HMM Analysis Dashboard** provides a unified, category-based interface for exploring all HMM research data with dynamic filtering capabilities:

### Research Categories

1. **Lambda2 Analysis** - Second eigenvalue analysis for mixing time studies
2. **Entropy Analysis** - Matrix entropy analysis for transition and emission matrices
3. **Steady State Analysis** - Equilibrium distribution analysis
4. **LLM Tokenization** - LLM tokenization analysis with 4-state 4-emission configuration
5. **Large State Analysis** - Analysis with large state spaces (early experiments)
6. **2-State Analysis** - Analysis with 2-emission configurations

### Key Features

- **Category-First Approach**: Select research category first, then available variables update dynamically
- **Smart Filtering**: Variable options automatically update based on data availability
- **Dynamic Model Selection**: Choose between model comparison or metric comparison modes
- **Unified Data Loading**: Handles both single files and directory-based datasets
- **Interactive Visualizations**: Professional charts with logarithmic scaling and responsive design

### Data Organization

The dashboard intelligently handles different data structures:
- **Single Files**: `lambda2_results.csv`, `entropy_results.csv`, `steady_state_results.csv`
- **Individual Model Files**: Specific tokenization and analysis files
- **Directory Collections**: Multiple files aggregated for large state and 2-state analyses

## Quick Start

Run the application in development mode:
```bash
npm start
```

Navigate to [http://localhost:3000](http://localhost:3000) to access the dashboard.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

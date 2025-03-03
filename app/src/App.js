import React, {useEffect} from "react";
import {BrowserRouter as Router, Route, Routes, useNavigate} from "react-router-dom";
import {createTheme, ThemeProvider} from "@mui/material";
import {Layout} from "./components/Layout";
import {Dashboard} from "./pages/Dashboard";
import {AnalysisDetail} from "./pages/AnalysisDetail";
import {Settings} from "./pages/Settings";

const theme = createTheme({
  palette: {
    primary: {main: "#1976d2"},
    secondary: {main: "#dc004e"},
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
  },
});

const RedirectHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let redirectPath = sessionStorage.getItem("redirectPath");

    if (redirectPath) {
      sessionStorage.removeItem("redirectPath");

      if (!redirectPath.startsWith('/')) {
        redirectPath = '/' + redirectPath;
      }

      navigate(redirectPath, {replace: true});
    }
  }, [navigate]);

  return null;
};

function App() {
  return (
      <ThemeProvider theme={theme}>
        <Router basename="/infosec">
          <RedirectHandler/>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard/>}/>
              <Route path="/analysis/:id" element={<AnalysisDetail/>}/>
              <Route path="/settings" element={<Settings/>}/>
            </Routes>
          </Layout>
        </Router>
      </ThemeProvider>
  );
}

export default App;

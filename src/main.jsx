import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Button, Card } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';

createRoot(document.getElementById('root')).render(
<div> 
    <h1> TODO </h1>
    <Button> Create Website? </Button>
</div>
)

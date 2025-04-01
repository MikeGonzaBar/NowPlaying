import { Link } from 'react-router-dom';
import { Box } from '@mui/material';
import SideBar from '../../components/sideBar';
function Music() {
    const drawerWidth = 160

    return (
        <div>
            <Box sx={{ display: 'flex' }}>
                <SideBar activeItem="Music" /> {/* Highlight "Music" */}
                <Box
                    component="main"
                    sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` } }}
                >
                    <h1>This is Page 3</h1>
                    <button>
                        <Link to="/">Go to Landing Page</Link>
                    </button>
                    <button>
                        <Link to="/page2">Go to Page 2</Link>
                    </button>
                    <button>
                        <Link to="/page3">Go to Page 3</Link>
                    </button>

                </Box>


            </Box>
        </div>
    );
}

export default Music;
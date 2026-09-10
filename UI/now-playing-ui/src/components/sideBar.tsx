import { useState } from "react";
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  Gamepad2,
  Film,
  Music,
  BarChart3,
  UserRound,
  LogOut,
} from "lucide-react";
import { removeAuthToken } from "../utils/auth";
import { zincColors } from "../theme";

interface SideBarProps {
  activeItem: string;
}

export const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  {
    text: "Home",
    short: "Home",
    icon: <Home size={20} strokeWidth={1.75} />,
    route: "/dashboard",
  },
  {
    text: "Games",
    short: "Games",
    icon: <Gamepad2 size={20} strokeWidth={1.75} />,
    route: "/games",
  },
  {
    text: "Movies & TV",
    short: "Movies",
    icon: <Film size={20} strokeWidth={1.75} />,
    route: "/movies",
  },
  {
    text: "Music",
    short: "Music",
    icon: <Music size={20} strokeWidth={1.75} />,
    route: "/music",
  },
  {
    text: "Analytics",
    short: "Analytics",
    icon: <BarChart3 size={20} strokeWidth={1.75} />,
    route: "/analytics",
  },
];

function SideBar({ activeItem }: SideBarProps) {
  const navigate = useNavigate();
  const [accountMenuAnchor, setAccountMenuAnchor] =
    useState<HTMLElement | null>(null);

  const handleLogout = () => {
    setAccountMenuAnchor(null);
    removeAuthToken();
    navigate("/auth", { replace: true });
  };

  const navButtonStyles = {
    borderRadius: "8px",
    px: 1.5,
    py: 1.1,
    mt: 1.25,
    minHeight: 44,
    transition: "background-color 0.15s ease, color 0.15s ease",
    "&:focus-visible": {
      outline: "2px solid #00a8cc",
      outlineOffset: "2px",
    },
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
  };

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Box sx={{ px: 2, py: 3 }}>
        <Box
          component={Link}
          to="/dashboard"
          aria-label="Now Playing — home"
          sx={{ display: "block", textAlign: "center" }}
        >
          <Box
            component="img"
            src={"/nowPlaying.svg"}
            alt=""
            aria-hidden="true"
            sx={{ width: 104, height: 104, maxWidth: "100%" }}
          />
        </Box>
      </Box>

      <List sx={{ px: 1, py: 1, flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeItem === item.text;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                to={item.route}
                aria-label={item.text}
                aria-current={isActive ? "page" : undefined}
                sx={{
                  ...navButtonStyles,
                  backgroundColor: isActive
                    ? "rgba(0, 168, 204, 0.14)"
                    : "transparent",
                  borderLeft: isActive
                    ? "3px solid #00a8cc"
                    : "3px solid transparent",
                  pl: 1.25,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: "auto",
                    mr: 1.5,
                    svg: {
                      fontSize: 20,
                      color: isActive ? "#00a8cc" : "#a1a1aa",
                    },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                    color: zincColors.white,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ px: 1, pb: 1.5 }}>
        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", mb: 1 }} />
        <ListItem disablePadding sx={{ display: "block" }}>
          <ListItemButton
            component={Link}
            to="/profile"
            sx={{ ...navButtonStyles, mt: 0, minHeight: 44 }}
          >
            <ListItemIcon
              sx={{
                minWidth: "auto",
                mr: 1.5,
                svg: { fontSize: 20, color: "#a1a1aa" },
              }}
            >
              <UserRound size={20} strokeWidth={1.75} />
            </ListItemIcon>
            <ListItemText
              primary="Connections & account"
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: 500,
                color: zincColors.white,
              }}
            />
          </ListItemButton>
          <ListItemButton
            onClick={handleLogout}
            sx={{ ...navButtonStyles, mt: 0, minHeight: 44 }}
          >
            <ListItemIcon
              sx={{
                minWidth: "auto",
                mr: 1.5,
                svg: { fontSize: 20, color: "#f87171" },
              }}
            >
              <LogOut size={20} strokeWidth={1.75} />
            </ListItemIcon>
            <ListItemText
              primary="Sign out"
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: 500,
                color: "#f87171",
              }}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  const mobileNav = (
    <Box
      sx={{
        display: { xs: "flex", sm: "none" },
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1300,
        height: 60,
        minHeight: 60,
        backgroundColor: "#0c0c0f",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        alignItems: "stretch",
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <Box
        component="nav"
        aria-label="Primary"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "stretch",
          minWidth: 0,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeItem === item.text;
          return (
            <Box
              key={item.text}
              component={Link}
              to={item.route}
              aria-label={item.text}
              aria-current={isActive ? "page" : undefined}
              sx={{
                flex: 1,
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "2px",
                color: isActive ? "#00a8cc" : "#a1a1aa",
                textDecoration: "none",
                borderTop: isActive
                  ? "2px solid #00a8cc"
                  : "2px solid transparent",
                "&:focus-visible": {
                  outline: "2px solid #00a8cc",
                  outlineOffset: -2,
                },
              }}
            >
              {item.icon}
              <Box
                component="span"
                sx={{
                  fontSize: 10,
                  lineHeight: 1.2,
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {item.short}
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <IconButton
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={Boolean(accountMenuAnchor)}
          onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
          sx={{
            width: 44,
            height: 44,
            mr: 1,
            color: activeItem === "Profile" ? "#00a8cc" : "#a1a1aa",
            "&:focus-visible": {
              outline: "2px solid #00a8cc",
              outlineOffset: "2px",
            },
          }}
        >
          <UserRound size={20} strokeWidth={1.75} />
        </IconButton>
        <Menu
          anchorEl={accountMenuAnchor}
          open={Boolean(accountMenuAnchor)}
          onClose={() => setAccountMenuAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "12px",
              },
            },
          }}
        >
          <MenuItem
            component={Link}
            to="/profile"
            onClick={() => setAccountMenuAnchor(null)}
            sx={{ minHeight: 44, fontSize: 14 }}
          >
            Connections & account
          </MenuItem>
          <MenuItem
            onClick={handleLogout}
            sx={{ minHeight: 44, fontSize: 14, color: "#f87171" }}
          >
            Sign out
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <>
      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{
          width: { sm: DRAWER_WIDTH },
          flexShrink: { sm: 0 },
          display: { xs: "none", sm: "block" },
        }}
      >
        <Drawer
          variant="permanent"
          sx={{
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              backgroundColor: "#0c0c0f",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      {mobileNav}
    </>
  );
}

export default SideBar;

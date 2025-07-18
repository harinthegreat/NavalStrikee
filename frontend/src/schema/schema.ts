import { z } from "zod";

// Game-related schemas for battleship
export const shipSchema = z.object({
  id: z.string(),
  name: z.enum(["carrier", "battleship", "cruiser", "submarine", "destroyer"]),
  length: z.number(),
  positions: z.array(z.object({
    row: z.number(),
    col: z.number()
  })),
  orientation: z.enum(["horizontal", "vertical"]),
  isPlaced: z.boolean(),
  hits: z.array(z.object({
    row: z.number(),
    col: z.number()
  })),
  isSunk: z.boolean()
});

export const gameStateSchema = z.object({
  id: z.string(),
  roomCode: z.string(),
  phase: z.enum(["setup", "battle", "finished"]),
  currentTurn: z.enum(["player", "opponent"]),
  playerGrid: z.array(z.array(z.object({
    row: z.number(),
    col: z.number(),
    hasShip: z.boolean(),
    isHit: z.boolean(),
    shipId: z.string().nullable()
  }))),
  opponentGrid: z.array(z.array(z.object({
    row: z.number(),
    col: z.number(),
    isHit: z.boolean(),
    isMiss: z.boolean(),
    hasShip: z.boolean().nullable()
  }))),
  playerShips: z.array(shipSchema),
  opponentShipsRemaining: z.number(),
  winner: z.enum(["player", "opponent"]).nullable()
});

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  isAuthenticated: z.boolean()
});

export const insertUserSchema = z.object({
  username: z.string(),
  isAuthenticated: z.boolean()
});

export const authFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const joinGameFormSchema = z.object({
  roomCode: z.string().min(6, "Room code must be 6 characters").max(6)
});

export type Ship = z.infer<typeof shipSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AuthFormData = z.infer<typeof authFormSchema>;
export type JoinGameFormData = z.infer<typeof joinGameFormSchema>;

// Ship definitions
export const SHIP_DEFINITIONS = {
  carrier: { name: "Carrier", length: 5 },
  battleship: { name: "Battleship", length: 4 },
  cruiser: { name: "Cruiser", length: 3 },
  submarine: { name: "Submarine", length: 3 },
  destroyer: { name: "Destroyer", length: 2 }
} as const;

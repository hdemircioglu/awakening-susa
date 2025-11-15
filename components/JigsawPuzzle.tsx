import React, { useState, useEffect, useRef, useMemo } from 'react';

const PUZZLE_ROWS = 3;
const PUZZLE_COLS = 4;
const PIECE_COUNT = PUZZLE_ROWS * PUZZLE_COLS;

interface PuzzlePiece {
  id: number;
  imgSrc: string;
  correctRow: number;
  correctCol: number;
}

interface JigsawPuzzleProps {
  imageUrl: string;
  onComplete: () => void;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  let currentIndex = newArray.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
};

export function JigsawPuzzle({ imageUrl, onComplete }: JigsawPuzzleProps) {
    const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
    const [shuffledPieces, setShuffledPieces] = useState<PuzzlePiece[]>([]);
    const [placedPieces, setPlacedPieces] = useState<Record<string, PuzzlePiece | null>>({});
    const [isLoading, setIsLoading] = useState(true);
    const draggedPieceRef = useRef<PuzzlePiece | null>(null);

    const unplacedPieces = useMemo(() => 
        // FIX: Explicitly type `placed` to resolve a TypeScript error where it was being inferred as `unknown`.
        shuffledPieces.filter(p => !Object.values(placedPieces).some((placed: PuzzlePiece | null) => placed?.id === p.id)), 
        [shuffledPieces, placedPieces]
    );

    useEffect(() => {
        const createPieces = async () => {
            setIsLoading(true);
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrl;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const pieceWidth = img.width / PUZZLE_COLS;
                const pieceHeight = img.height / PUZZLE_ROWS;

                canvas.width = pieceWidth;
                canvas.height = pieceHeight;

                const newPieces: PuzzlePiece[] = [];
                for (let row = 0; row < PUZZLE_ROWS; row++) {
                    for (let col = 0; col < PUZZLE_COLS; col++) {
                        ctx.clearRect(0, 0, pieceWidth, pieceHeight);
                        ctx.drawImage(
                            img,
                            col * pieceWidth,
                            row * pieceHeight,
                            pieceWidth,
                            pieceHeight,
                            0,
                            0,
                            pieceWidth,
                            pieceHeight
                        );
                        
                        newPieces.push({
                            id: row * PUZZLE_COLS + col,
                            imgSrc: canvas.toDataURL(),
                            correctRow: row,
                            correctCol: col,
                        });
                    }
                }
                setPieces(newPieces);
                setShuffledPieces(shuffleArray(newPieces));
                
                const initialPlaced: Record<string, PuzzlePiece | null> = {};
                for (let i = 0; i < PIECE_COUNT; i++) {
                    initialPlaced[`${Math.floor(i / PUZZLE_COLS)}-${i % PUZZLE_COLS}`] = null;
                }
                setPlacedPieces(initialPlaced);
                
                setIsLoading(false);
            };
            img.onerror = () => {
                console.error("Failed to load image for puzzle");
                setIsLoading(false);
            }
        };

        if (imageUrl) {
            createPieces();
        }
    }, [imageUrl]);

    useEffect(() => {
        const placedCount = Object.values(placedPieces).filter(p => p !== null).length;
        if (placedCount > 0 && placedCount === PIECE_COUNT) {
            setTimeout(onComplete, 500); 
        }
    }, [placedPieces, onComplete]);

    const handleDragStart = (piece: PuzzlePiece) => {
        draggedPieceRef.current = piece;
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (row: number, col: number) => {
        const piece = draggedPieceRef.current;
        if (!piece || piece.correctRow !== row || piece.correctCol !== col) {
            return;
        }

        const key = `${row}-${col}`;
        if (placedPieces[key] === null) {
            setPlacedPieces(prev => ({
                ...prev,
                [key]: piece,
            }));
            setShuffledPieces(prev => prev.filter(p => p.id !== piece.id));
        }
        draggedPieceRef.current = null;
    };
    
    if (isLoading) {
        return (
            <div className="aspect-video flex items-center justify-center bg-slate-900/50">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-t-transparent border-white rounded-full animate-spin mx-auto"></div>
                    <p className="text-white mt-2 text-sm">Creating puzzle...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 bg-slate-800/50 rounded-lg">
            <div className="relative w-full grid grid-cols-4 grid-rows-3 gap-0.5 bg-slate-900/50 p-1 rounded" style={{ aspectRatio: '16/9' }}>
                <div 
                    style={{ backgroundImage: `url(${imageUrl})` }}
                    className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
                    aria-hidden="true"
                ></div>
                {Array.from({ length: PIECE_COUNT }).map((_, index) => {
                    const row = Math.floor(index / PUZZLE_COLS);
                    const col = index % PUZZLE_COLS;
                    const piece = placedPieces[`${row}-${col}`];
                    return (
                        <div
                            key={index}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(row, col)}
                            className="w-full h-full bg-slate-700/20"
                        >
                            {piece && <img src={piece.imgSrc} className="w-full h-full object-cover" alt={`Puzzle piece ${piece.id}`} />}
                        </div>
                    );
                })}
            </div>

            <div className="w-full bg-slate-900/50 p-2 rounded">
                <p className="text-center text-slate-400 text-sm mb-2">Drag pieces to the board</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {unplacedPieces.map(piece => (
                        <div
                            key={piece.id}
                            draggable
                            onDragStart={() => handleDragStart(piece)}
                            className="w-full cursor-grab active:cursor-grabbing p-0.5 bg-slate-700 rounded"
                            style={{ aspectRatio: '4 / 3' }}
                        >
                            <img src={piece.imgSrc} className="w-full h-full object-cover pointer-events-none rounded-sm" alt={`Puzzle piece ${piece.id}`}/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
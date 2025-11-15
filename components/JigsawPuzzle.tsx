import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LightbulbIcon } from './Icons';

interface PuzzlePiece {
  id: number;
  imgSrc: string;
  correctRow: number;
  correctCol: number;
}

interface JigsawPuzzleProps {
  imageUrl: string;
  onComplete: () => void;
  storyNumber: number;
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

export function JigsawPuzzle({ imageUrl, onComplete, storyNumber }: JigsawPuzzleProps) {
    const { rows, cols, pieceCount } = useMemo(() => {
        if (storyNumber <= 2) {
            return { rows: 3, cols: 4, pieceCount: 12 };
        } else {
            return { rows: 6, cols: 8, pieceCount: 48 };
        }
    }, [storyNumber]);
    
    const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
    const [shuffledPieces, setShuffledPieces] = useState<PuzzlePiece[]>([]);
    const [placedPieces, setPlacedPieces] = useState<Record<string, PuzzlePiece | null>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [slotSize, setSlotSize] = useState<{ width: number; height: number } | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const draggedPieceRef = useRef<PuzzlePiece | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [newlyPlacedId, setNewlyPlacedId] = useState<number | null>(null);


    const unplacedPieces = useMemo(() => 
        shuffledPieces.filter(p => !Object.values(placedPieces).some((placed: PuzzlePiece | null) => placed?.id === p.id)), 
        [shuffledPieces, placedPieces]
    );

    const trayPieceSize = useMemo(() => {
        if (!slotSize) return null;
        // Pieces in the tray are now the same size as the slots on the board.
        return {
            width: slotSize.width,
            height: slotSize.height,
        };
    }, [slotSize]);

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

                const pieceWidth = img.width / cols;
                const pieceHeight = img.height / rows;

                canvas.width = pieceWidth;
                canvas.height = pieceHeight;

                const newPieces: PuzzlePiece[] = [];
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
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
                            id: row * cols + col,
                            imgSrc: canvas.toDataURL(),
                            correctRow: row,
                            correctCol: col,
                        });
                    }
                }
                setPieces(newPieces);
                setShuffledPieces(shuffleArray(newPieces));
                
                const initialPlaced: Record<string, PuzzlePiece | null> = {};
                for (let i = 0; i < pieceCount; i++) {
                    initialPlaced[`${Math.floor(i / cols)}-${i % cols}`] = null;
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
    }, [imageUrl, rows, cols, pieceCount]);
    
    useEffect(() => {
        const gridEl = gridRef.current;
        if (!gridEl || isLoading) return;

        const measure = () => {
            const firstChild = gridEl.children[0] as HTMLElement;
            if (firstChild) {
                setSlotSize({
                    width: firstChild.offsetWidth,
                    height: firstChild.offsetHeight,
                });
            }
        };
        
        const observer = new ResizeObserver(measure);
        observer.observe(gridEl);
        
        measure(); // Initial measurement

        return () => {
            observer.disconnect();
        };
    }, [isLoading]);


    useEffect(() => {
        const placedCount = Object.values(placedPieces).filter(p => p !== null).length;
        if (!isCompleting && placedCount > 0 && placedCount === pieceCount) {
            setIsCompleting(true);
            setTimeout(onComplete, 1500); 
        }
    }, [placedPieces, onComplete, pieceCount, isCompleting]);

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
            setNewlyPlacedId(piece.id);
            setTimeout(() => setNewlyPlacedId(null), 500);
        }
        draggedPieceRef.current = null;
    };

    const handleHint = () => {
        if (unplacedPieces.length === 0) return;

        const randomPiece = unplacedPieces[Math.floor(Math.random() * unplacedPieces.length)];
        
        const key = `${randomPiece.correctRow}-${randomPiece.correctCol}`;

        setPlacedPieces(prev => ({
            ...prev,
            [key]: randomPiece,
        }));
        setNewlyPlacedId(randomPiece.id);
        setTimeout(() => setNewlyPlacedId(null), 500);
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
            <div 
                className={`relative w-full bg-slate-900/50 p-1 rounded ${isCompleting ? 'puzzle-solved' : ''}`}
                style={{ aspectRatio: '16 / 9' }}
            >
                {/* FIX: Re-added the guide image with low opacity behind the puzzle grid. */}
                <img 
                  src={imageUrl} 
                  alt="Puzzle guide" 
                  className="absolute inset-1 w-[calc(100%-0.5rem)] h-[calc(100%-0.5rem)] object-cover opacity-20 pointer-events-none rounded-sm"
                />
                <div
                    ref={gridRef}
                    className="w-full h-full grid gap-0.5"
                    style={{ 
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                    }}
                >
                    {Array.from({ length: pieceCount }).map((_, index) => {
                        const row = Math.floor(index / cols);
                        const col = index % cols;
                        const piece = placedPieces[`${row}-${col}`];
                        return (
                            <div
                                key={index}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(row, col)}
                                className="w-full h-full bg-slate-700/20"
                            >
                                {piece && <img src={piece.imgSrc} className={`w-full h-full object-cover ${newlyPlacedId === piece.id ? 'animate-piece-place' : ''}`} alt={`Puzzle piece ${piece.id}`} />}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="w-full bg-slate-900/50 p-2 rounded">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-slate-400 text-sm">Drag pieces to the board ({unplacedPieces.length} remaining)</p>
                    <button 
                        onClick={handleHint}
                        disabled={unplacedPieces.length === 0 || isCompleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/80 text-slate-300 rounded-md border border-slate-600 hover:bg-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        aria-label="Get a hint"
                    >
                        <LightbulbIcon className="w-4 h-4" />
                        Hint
                    </button>
                </div>
                {/* FIX: Added flex-nowrap to ensure the horizontal scrollbar appears correctly when pieces overflow. */}
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2">
                    {trayPieceSize ? unplacedPieces.map(piece => (
                        <div
                            key={piece.id}
                            draggable
                            onDragStart={() => handleDragStart(piece)}
                            className="cursor-grab active:cursor-grabbing p-0.5 bg-slate-700 rounded flex-shrink-0"
                            style={{
                                width: `${trayPieceSize.width}px`,
                                height: `${trayPieceSize.height}px`,
                            }}
                        >
                            <img src={piece.imgSrc} className="w-full h-full object-cover pointer-events-none rounded-sm" alt={`Puzzle piece ${piece.id}`}/>
                        </div>
                    )) : <div className="w-full text-center text-slate-500 text-sm py-4">Loading pieces...</div>}
                </div>
            </div>
        </div>
    );
};

"use client";

import { useState, useEffect, useRef } from "react";
import { generateSafeJoke, type GenerateSafeJokeOutput } from "@/ai/flows/generate-safe-joke";
import { generateMemeImage, type GenerateMemeImageOutput } from "@/ai/flows/generate-meme-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Sparkles, Download, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

const jokeCategories = [
    { id: "dad jokes", label: "Dad Jokes", sfw: true },
    { id: "dark humor", label: "Dark Humor", sfw: false },
    { id: "pick-up lines", label: "Pick-up Lines", sfw: true },
    { id: "crypto memes", label: "Crypto Memes", sfw: true },
    { id: "roasts", label: "Roasts", sfw: false },
    { id: "wholesome jokes", label: "Wholesome Jokes", sfw: true },
    { id: "ai jokes", label: "AI Jokes", sfw: true },
    { id: "edgy memes", label: "Edgy Memes", sfw: false },
];

export default function LaughFactoryPage() {
    const [category, setCategory] = useState(jokeCategories[0].id);
    const [safeForWork, setSafeForWork] = useState(true);
    const [joke, setJoke] = useState<GenerateSafeJokeOutput | null>(null);
    const [memeImage, setMemeImage] = useState<GenerateMemeImageOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
    const { toast } = useToast();
    const memeCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const selectedCat = jokeCategories.find(cat => cat.id === category);
        if (selectedCat) {
            setSafeForWork(selectedCat.sfw);
        }
    }, [category]);

    const drawMeme = () => {
        const canvas = memeCanvasRef.current;
        const jokeText = joke?.joke;
        const imageUri = memeImage?.imageDataUri;

        if (canvas && jokeText && imageUri) {
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.src = imageUri;
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                ctx.fillStyle = "white";
                ctx.strokeStyle = "black";
                ctx.lineWidth = Math.max(1, img.width / 200);
                ctx.textAlign = "center";
                
                const fontSize = Math.max(20, img.width / 12);
                ctx.font = `bold ${fontSize}px 'Impact', sans-serif`;
                
                const x = canvas.width / 2;
                const y = canvas.height * 0.9;

                const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
                    const words = text.split(' ');
                    let line = '';
                    const lines = [];

                    for(let n = 0; n < words.length; n++) {
                        const testLine = line + words[n] + ' ';
                        const metrics = context.measureText(testLine);
                        const testWidth = metrics.width;
                        if (testWidth > maxWidth && n > 0) {
                            lines.push(line);
                            line = words[n] + ' ';
                        } else {
                            line = testLine;
                        }
                    }
                    lines.push(line);

                    let currentY = y - (lines.length - 1) * lineHeight;

                    for (let i = 0; i < lines.length; i++) {
                         context.strokeText(lines[i], x, currentY);
                         context.fillText(lines[i], x, currentY);
                         currentY += lineHeight;
                    }
                }
                
                const maxWidth = canvas.width * 0.9;
                const lineHeight = fontSize * 1.2;
                wrapText(ctx, jokeText.toUpperCase(), x, y, maxWidth, lineHeight);
            };
        }
    };

    useEffect(() => {
        if (category === 'crypto memes' && joke && memeImage) {
            drawMeme();
        }
    }, [joke, memeImage, category]);

    const handleGenerateJoke = async () => {
        setIsLoading(true);
        setJoke(null);
        setMemeImage(null);
        setSelectedReaction(null);
        try {
            const jokePromise = generateSafeJoke({ category, safeForWork });
            const memePromise = category === 'crypto memes' 
                ? generateMemeImage() 
                : Promise.resolve(null);

            const [jokeResult, memeResult] = await Promise.all([jokePromise, memePromise]);
            
            setJoke(jokeResult);
            if (memeResult) {
                setMemeImage(memeResult);
            }

        } catch (error) {
            console.error("Failed to generate joke/meme:", error);
            toast({
                title: "Error",
                description: "Oops! Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        if (joke?.joke) {
            navigator.clipboard.writeText(joke.joke);
            toast({
                title: "Copied!",
                description: "The joke has been copied to your clipboard.",
            });
        }
    };
    
    const handleDownloadMeme = () => {
        const canvas = memeCanvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = "laugh-factory-meme.png";
            link.href = dataUrl;
            link.click();
        }
    };

    const handleCategoryChange = (value: string) => {
        setCategory(value);
    };

    return (
        <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 pt-12 sm:pt-20">
            <main className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-10">
                <header className="text-center">
                    <h1 className="text-5xl md:text-6xl font-bold font-headline text-primary mb-2">Laugh Factory</h1>
                    <p className="text-lg text-muted-foreground">Your daily dose of AI-powered humor</p>
                </header>
                
                <Card className="w-full bg-card/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border">
                     <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center">Top Joke of the Day</CardTitle>
                        <CardDescription className="text-center">This joke is on fire! 🔥</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-xl font-medium">Why don't scientists trust atoms? Because they make up everything!</p>
                         <div className="flex justify-center items-center space-x-2 mt-4">
                            <Button variant={'outline'} size="icon">
                                <span role="img" aria-label="laughing emoji">😂</span>
                            </Button>
                            <span className="font-bold text-lg">1.2k</span>
                        </div>
                    </CardContent>
                </Card>

                <div className="w-full bg-card/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border">
                    <div className="space-y-8">
                        <div>
                            <Label className="text-xl font-semibold mb-4 block text-center sm:text-left">Choose a Category</Label>
                            <RadioGroup value={category} onValueChange={handleCategoryChange} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {jokeCategories.map((cat) => (
                                    <div key={cat.id}>
                                        <RadioGroupItem value={cat.id} id={cat.id} className="sr-only" />
                                        <Label
                                            htmlFor={cat.id}
                                            className="flex flex-col items-center justify-center rounded-lg border-2 p-4 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer data-[state=checked]:border-primary data-[state=checked]:ring-2 data-[state=checked]:ring-primary h-full"
                                            data-state={category === cat.id ? 'checked' : 'unchecked'}
                                        >
                                            {cat.label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-background">
                            <Label htmlFor="sfw-switch" className="text-lg font-semibold flex-1">
                                Safe For Work
                            </Label>
                            <Switch
                                id="sfw-switch"
                                checked={safeForWork}
                                onCheckedChange={setSafeForWork}
                                aria-label="Toggle safe for work filter"
                                disabled
                            />
                        </div>

                        <Button onClick={handleGenerateJoke} disabled={isLoading} size="lg" className="w-full text-lg font-bold h-14">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-6 w-6" />
                            )}
                            Generate
                        </Button>
                    </div>
                </div>
                
                <div className="w-full min-h-[200px]">
                    {isLoading && (
                         <Card className="w-full bg-card/80">
                            <CardHeader>
                                <Skeleton className="h-8 w-3/4 rounded-md" />
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                                <Skeleton className="h-64 w-full rounded-md" />
                            </CardContent>
                        </Card>
                    )}
                    
                    {!isLoading && joke && category === 'crypto memes' && memeImage && (
                        <Card className="w-full animate-in fade-in-0 zoom-in-95 duration-500 bg-card/80 backdrop-blur-sm shadow-lg border rounded-2xl">
                             <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <CardTitle className="text-2xl font-bold text-primary">Meme Generated!</CardTitle>
                                <Button variant="ghost" size="icon" onClick={handleDownloadMeme} aria-label="Download meme">
                                    <Download className="h-5 w-5" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <canvas ref={memeCanvasRef} className="w-full h-auto rounded-lg border" />
                            </CardContent>
                        </Card>
                    )}

                    {!isLoading && joke && category !== 'crypto memes' && (
                         <Card className="w-full animate-in fade-in-0 zoom-in-95 duration-500 bg-card/80 backdrop-blur-sm shadow-lg border rounded-2xl">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <CardTitle className="text-2xl font-bold text-primary">Here's a good one!</CardTitle>
                                <Button variant="ghost" size="icon" onClick={handleCopyToClipboard} aria-label="Copy joke">
                                    <Copy className="h-5 w-5" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-medium leading-relaxed">{joke.joke}</p>
                                <div className="flex justify-end items-center space-x-2 mt-6">
                                    <Button variant={selectedReaction === 'laugh' ? 'default' : 'outline'} size="icon" onClick={() => setSelectedReaction('laugh')}>
                                        <span role="img" aria-label="laughing emoji">😂</span>
                                    </Button>
                                    <Button variant={selectedReaction === 'neutral' ? 'default' : 'outline'} size="icon" onClick={() => setSelectedReaction('neutral')}>
                                        <span role="img" aria-label="neutral face emoji">😐</span>
                                    </Button>
                                    <Button variant={selectedReaction === 'unamused' ? 'default' : 'outline'} size="icon" onClick={() => setSelectedReaction('unamused')}>
                                        <span role="img" aria-label="unamused face emoji">🙄</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}

    
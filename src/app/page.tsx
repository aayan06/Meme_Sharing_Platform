
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { generateSafeJoke, type GenerateSafeJokeOutput } from "@/ai/flows/generate-safe-joke";
import { generateMemeImage, type GenerateMemeImageOutput } from "@/ai/flows/generate-meme-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Sparkles, Download, Trophy, Send, Share2, Link as LinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

function setMeta(url: string, description: string) {
    // Remove existing og:image and twitter:image meta tags
    document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(el => el.remove());
    
    // Create and append new og:image meta tag
    const ogImage = document.createElement('meta');
    ogImage.setAttribute('property', 'og:image');
    ogImage.setAttribute('content', url);
    document.head.appendChild(ogImage);

    // Create and append new twitter:image meta tag
    const twitterImage = document.createElement('meta');
    twitterImage.setAttribute('name', 'twitter:image');
    twitterImage.setAttribute('content', url);
    document.head.appendChild(twitterImage);

    // Update description meta tags
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
}

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
    
    useEffect(() => {
        if (!joke) {
            setMeta('https://placehold.co/1200x630.png', 'Your daily dose of AI-powered humor');
            return;
        }

        if (category === 'crypto memes' && memeImage?.imageDataUri) {
            setMeta(memeImage.imageDataUri, joke.joke);
        } else {
             setMeta('https://placehold.co/1200x630.png', joke.joke);
        }
    }, [joke, memeImage, category]);

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

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied!",
            description: "The joke has been copied to your clipboard.",
        });
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

    const handleShare = (platform: 'twitter' | 'telegram' | 'reddit' | 'copy') => {
        const jokeText = joke?.joke || '';
        const pageUrl = window.location.href;
        const encodedText = encodeURIComponent(jokeText);
        const encodedUrl = encodeURIComponent(pageUrl);

        if (platform === 'copy') {
             navigator.clipboard.writeText(pageUrl);
             toast({ title: "Link Copied!", description: "The link has been copied to your clipboard." });
             return;
        }

        let shareUrl = '';
        switch(platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
                break;
            case 'reddit':
                shareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent('Check out this joke from Laugh Factory!')}`;
                break;
        }
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }

    const ShareMenu = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Share joke">
                    <Share2 className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                 <DropdownMenuItem onClick={() => handleShare('twitter')}>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                    <span>Twitter</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('telegram')}>
                     <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.17.9-.502 1.201-1.233 1.201-.859 0-1.31-.362-1.826-.856-1.024-.985-1.59-1.59-2.545-2.522-.984-.958-.352-1.488.24-2.203.11-.129.21-.264.315-.405.471-.624.942-1.248 1.408-1.868.087-.113.174-.227.26-.339.09-.121.018-.216-.109-.192-.15.03-.43.14-.735.33-.428.27-.84.54-1.22.81-.79.55-1.58.9-2.37.64-.87-.3-1.53-.94-2.19-1.58-.6-.58-1.17-1.44-.98-2.31.2-.95.83-1.84 1.4-2.31.57-.47 1.27-.75 2.1-.86 1.05-.13 2.07.16 2.9.62.24.13.48.27.72.4.1.06.2.12.28.18.09.06.18.03.21-.07.03-.11.05-.22.05-.33z"></path></svg>
                    <span>Telegram</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('reddit')}>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87s-7.004-2.176-7.004-4.87c0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.34.34 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12.422a1.223 1.223 0 0 1-1.223-1.223 1.223 1.223 0 0 1 1.223-1.223c.675 0 1.223.548 1.223 1.223a1.223 1.223 0 0 1-1.223 1.223zm5.5 0a1.223 1.223 0 0 1-1.223-1.223 1.223 1.223 0 0 1 1.223-1.223c.675 0 1.223.548 1.223 1.223a1.223 1.223 0 0 1-1.223 1.223zm.822 5.023c-.382.383-1.041.5-1.564.5s-1.182-.117-1.565-.5c-.387-.387-.502-1.044-.502-1.637 0-.593.115-1.25.502-1.637.382-.382 1.04-.5 1.565-.5s1.183.118 1.565.5c.386.386.502 1.044.502 1.637 0 .593-.116 1.25-.502 1.637z"></path></svg>
                    <span>Reddit</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}>
                   <LinkIcon className="h-4 w-4 mr-2" />
                   <span>Copy Link</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )

    return (
        <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 pt-12 sm:pt-20">
            <main className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-10">
                <header className="text-center w-full">
                    <h1 className="text-5xl md:text-6xl font-bold font-headline text-primary mb-2">Laugh Factory</h1>
                    <p className="text-lg text-muted-foreground">Your daily dose of AI-powered humor</p>
                    <div className="flex justify-center items-center space-x-4 mt-6">
                        <Button asChild>
                            <Link href="/submit"><Trophy className="mr-2" /> Leaderboard</Link>
                        </Button>
                        <Button asChild variant="outline">
                           <Link href="/submit"><Send className="mr-2" /> Submit Joke</Link>
                        </Button>
                    </div>
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
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-2xl font-bold text-primary">Meme Generated!</CardTitle>
                                <div className="flex items-center">
                                    <ShareMenu />
                                    <Button variant="ghost" size="icon" onClick={handleDownloadMeme} aria-label="Download meme">
                                        <Download className="h-5 w-5" />
                                    </Button>
                                </div>
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
                                <div className="flex items-center">
                                    <ShareMenu />
                                    <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(joke.joke)} aria-label="Copy joke">
                                        <Copy className="h-5 w-5" />
                                    </Button>
                                </div>
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

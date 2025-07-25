
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { generateSafeJoke, type GenerateSafeJokeOutput } from "@/ai/flows/generate-safe-joke";
import { generateMemeImage, type GenerateMemeImageOutput } from "@/ai/flows/generate-meme-image";
import { createCustomMeme } from "@/ai/flows/create-custom-meme";
import { generateAudio, type GenerateAudioOutput } from "@/ai/flows/generate-audio";
import { submitMeme } from "@/ai/flows/submit-meme";
import { voteOnMeme } from "@/ai/flows/vote-on-meme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Sparkles, Download, Trophy, Send, Share2, Link as LinkIcon, Volume2, Crown, FileUp, Palette, PenSquare, Laugh, X, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

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
    document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(el => el.remove());
    
    const ogImage = document.createElement('meta');
    ogImage.setAttribute('property', 'og:image');
    ogImage.setAttribute('content', url);
    document.head.appendChild(ogImage);

    const twitterImage = document.createElement('meta');
    twitterImage.setAttribute('name', 'twitter:image');
    twitterImage.setAttribute('content', url);
    document.head.appendChild(twitterImage);

    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
}

export default function LaughFactoryPage() {
    const { user, userData } = useAuth();
    const [mode, setMode] = useState<'generate' | 'create' | 'leaderboard'>('generate');
    const [category, setCategory] = useState(jokeCategories[0].id);
    const [joke, setJoke] = useState<GenerateSafeJokeOutput | null>(null);
    const [usedJokes, setUsedJokes] = useState<string[]>([]);
    const [memeImage, setMemeImage] = useState<GenerateMemeImageOutput | null>(null);
    const [audio, setAudio] = useState<GenerateAudioOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
    const [customMemeText, setCustomMemeText] = useState("");
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const { toast } = useToast();
    const memeCardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
    const [votingStatus, setVotingStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (mode === 'leaderboard') {
            fetchLeaderboard();
        }
    }, [mode]);

    useEffect(() => {
        const isMemeCategory = category === 'crypto memes' || category === 'edgy memes' || (mode === 'create' && (uploadedImage || memeImage) && joke);
        if (!joke) {
            setMeta('https://placehold.co/1200x630.png', 'Your daily dose of AI-powered humor');
            return;
        }

        if (isMemeCategory && (memeImage?.imageDataUri || uploadedImage)) {
            // Delay screenshot for social media sharing until image is loaded
            setTimeout(() => takeMemeScreenshot(setMeta), 500);
        } else {
             setMeta('https://placehold.co/1200x630.png', joke.joke);
        }
    }, [joke, memeImage, category, uploadedImage, customMemeText, mode]);

    const fetchLeaderboard = async () => {
        setIsLoadingLeaderboard(true);
        try {
            const q = query(collection(db, "memes"), orderBy("voteCount", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            const jokes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeaderboard(jokes);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            toast({ title: "Error", description: "Could not load the leaderboard.", variant: "destructive" });
        } finally {
            setIsLoadingLeaderboard(false);
        }
    };
    
    const handleVote = async (memeId: string) => {
        if (!user) {
            toast({ title: "Login Required", description: "You need to be logged in to vote.", variant: "destructive"});
            return;
        }
        setVotingStatus(prev => ({...prev, [memeId]: true}));
        try {
            const result = await voteOnMeme({ memeId, userId: user.uid });
            if (result.success) {
                toast({ title: "Vote Counted!", description: "You made this meme funnier."});
                fetchLeaderboard(); // Refresh to show new vote count
            } else {
                 toast({ title: "Already Voted", description: result.message, variant: "destructive"});
            }
        } catch (error) {
            toast({ title: "Error", description: "Could not cast your vote.", variant: "destructive"});
        } finally {
            setVotingStatus(prev => ({...prev, [memeId]: false}));
        }
    }

    const takeMemeScreenshot = async (callback?: (dataUrl: string, description: string) => void): Promise<string | null> => {
        const element = memeCardRef.current;
        if (!element) return null;

        const imageElement = element.querySelector('img');
        if (!imageElement) {
             console.error("Screenshot failed: Could not find image element inside the card.");
             return uploadedImage || memeImage?.imageDataUri || null;
        }

        try {
            // Wait for the image to be fully loaded before taking the screenshot
            await new Promise((resolve, reject) => {
                if (imageElement.complete && imageElement.naturalHeight !== 0) {
                    resolve(true);
                    return;
                }
                const timeout = setTimeout(() => reject(new Error("Image load timed out after 5 seconds.")), 5000);
                imageElement.onload = () => {
                    clearTimeout(timeout);
                    resolve(true);
                };
                imageElement.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error("Image failed to load."));
                };
            });
            
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(element, { 
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#111827', // Dark background for consistency
                logging: false,
            });
            const dataUrl = canvas.toDataURL('image/png');
            if(callback) callback(dataUrl, joke?.joke || '');
            return dataUrl;
        } catch (error) {
            console.error("Failed to capture meme screenshot:", error);
            const fallbackImage = uploadedImage || memeImage?.imageDataUri || null;
            if(callback && fallbackImage) callback(fallbackImage, joke?.joke || '');
            return fallbackImage;
        }
    };

    const handleGenerateJoke = async () => {
        setIsLoading(true);
        setJoke(null);
        setMemeImage(null);
        setAudio(null);
        setSelectedReaction(null);
        try {
            if (mode === 'create') {
                if (!customMemeText) {
                     toast({
                        title: "Meme Idea Needed",
                        description: "Please describe your meme idea before generating.",
                        variant: "destructive",
                    });
                    setIsLoading(false);
                    return;
                }
                const result = await createCustomMeme({
                    topic: customMemeText,
                    imageDataUri: uploadedImage || undefined
                });
                setJoke({ joke: result.joke });
                setMemeImage({ imageDataUri: result.imageDataUri });
            } else {
                const selectedCategory = jokeCategories.find(cat => cat.id === category);
                if (!selectedCategory) {
                    throw new Error("Category not found");
                }

                const isSfw = selectedCategory.sfw;
                const isMemeCategory = category === 'crypto memes' || category === 'edgy memes';

                const jokeResult = await generateSafeJoke({ category, safeForWork: isSfw, usedJokes });
                setJoke(jokeResult);
                setUsedJokes(prev => [...prev, jokeResult.joke]);


                if (isMemeCategory) {
                    const memeResult = await generateMemeImage({ category, safeForWork: isSfw, joke: jokeResult.joke });
                    if (memeResult) {
                        setMemeImage(memeResult);
                    }
                }
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
    
    const handleDownloadMeme = async () => {
        const imageUri = await takeMemeScreenshot();
        if (imageUri) {
            const link = document.createElement("a");
            link.download = "haha-launch-meme.png";
            link.href = imageUri;
            link.click();
        }
    };
    
    const handleSubmit = async () => {
        if (!user) {
            toast({ title: "Not Logged In", description: "You must be logged in to submit a meme.", variant: "destructive" });
            return;
        }
        if (!joke || (!memeImage && !uploadedImage)) {
            toast({ title: "Incomplete Meme", description: "Please generate a full meme with an image before submitting.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            // Add a delay to ensure the DOM is fully updated before taking a screenshot
            await new Promise(resolve => setTimeout(resolve, 500));

            const finalImageUri = await takeMemeScreenshot();
            if (!finalImageUri) {
                throw new Error("Could not capture the final meme image.");
            }

            await submitMeme({
                userId: user.uid,
                joke: joke.joke,
                imageDataUri: finalImageUri,
            });
            
            toast({ title: "Meme Submitted!", description: "Thanks for making the world funnier! Your meme is now on the leaderboard." });
            setJoke(null);
            setMemeImage(null);
            setUploadedImage(null);
            setCustomMemeText('');
            
            // Switch to leaderboard view
            setMode('leaderboard');

        } catch (error: any) {
            console.error("Submission failed:", error);
            toast({ title: "Submission Error", description: error.message || "Could not submit your meme.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleCategoryChange = (value: string) => {
        const selectedCat = jokeCategories.find(cat => cat.id === value);
        if (selectedCat) {
            setCategory(value);
            setJoke(null);
            setMemeImage(null);
            setAudio(null);
            setSelectedReaction(null);
        }
    };
    
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setJoke(null); // Clear previous joke
                setMemeImage(null);
            };
            reader.readAsDataURL(file);
        } else {
            toast({
                title: "Invalid File",
                description: "Please upload a valid image file.",
                variant: "destructive"
            });
        }
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
                shareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent('Check out this joke from HAHA LAUNCH!')}`;
                break;
        }
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }

    const handleGenerateAudio = async (text: string) => {
        if (!text) return;
        setIsGeneratingAudio(true);
        setAudio(null);
        try {
            const audioResult = await generateAudio(text);
            setAudio(audioResult);
        } catch (error) {
            console.error("Failed to generate audio:", error);
            toast({
                title: "Audio Error",
                description: "Couldn't generate audio for this joke.",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const splitJoke = (text: string): { top: string; bottom: string } => {
        if (!text) return { top: '', bottom: '' };
    
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

        if (sentences.length >= 2) {
            const middleIndex = Math.ceil(sentences.length / 2);
            const top = sentences.slice(0, middleIndex).join(' ').trim();
            const bottom = sentences.slice(middleIndex).join(' ').trim();
            return { top, bottom };
        }
        
        const words = text.split(' ');
        if (words.length === 1) return { top: text, bottom: '' };
        const middleIndex = Math.ceil(words.length / 2);
        const top = words.slice(0, middleIndex).join(' ');
        const bottom = words.slice(middleIndex).join(' ');
        return { top, bottom };
    };

    const MemeText = ({ text }: { text: string }) => (
        <p
          className="w-full text-center text-xl sm:text-2xl md:text-4xl font-bold uppercase text-white break-words px-2"
          style={{
            textShadow: '3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 3px 0px 0 #000, -3px 0px 0 #000, 0px 3px 0 #000, 0px -3px 0 #000, 2px 2px 5px rgba(0,0,0,0.5)'
          }}
        >
          {text}
        </p>
    );

    const ShareMenu = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Share joke" className="rounded-full">
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
    );

    const JokeCard = ({ children, className, innerRef }: { children: React.ReactNode, className?: string, innerRef?: React.Ref<HTMLDivElement> }) => (
      <Card ref={innerRef} className={cn("w-full animate-in fade-in-0 zoom-in-95 duration-500 bg-card/90 backdrop-blur-sm shadow-lg border-2 rounded-2xl", className)}>
        {children}
      </Card>
    );

    const handleModeChange = (newMode: 'generate' | 'create' | 'leaderboard') => {
        setMode(newMode);
        setJoke(null);
        setMemeImage(null);
        setAudio(null);
        setSelectedReaction(null);
        setCustomMemeText('');
        setUploadedImage(null);
    };
    
    const isMemeReady = joke && (memeImage?.imageDataUri || uploadedImage);

    const isMemeCategory = (mode === 'generate' && (category === 'crypto memes' || category === 'edgy memes')) || (mode === 'create' && isMemeReady);
    const { top, bottom } = splitJoke(joke?.joke || '');

    const dailyJoke = { joke: "I told my wife she should embrace her mistakes. She gave me a hug.", creator: "Comedian_AI", likes: 1337 };


    return (
        <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 dark">
            <main className="w-full max-w-3xl mx-auto flex flex-col items-center space-y-8">
                 <header className="text-center w-full space-y-2 mt-8 sm:mt-0 relative">
                    <div className="absolute top-0 right-0">
                        {user ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">{user.email?.split('@')[0]}</span>
                                <Button variant="ghost" size="icon" onClick={() => auth.signOut()}>
                                    <LogOut className="h-5 w-5" />
                                </Button>
                            </div>
                        ) : (
                             <Button asChild>
                                <Link href="/auth">Login</Link>
                            </Button>
                        )}
                    </div>
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold font-headline text-primary tracking-tighter">HAHA LAUNCH</h1>
                    <p className="text-base sm:text-lg text-muted-foreground">Your daily dose of AI-powered humor</p>
                </header>
                
                 <div className="w-full flex justify-center p-1 bg-card/80 backdrop-blur-lg rounded-full shadow-lg border">
                    <Button
                        onClick={() => handleModeChange('generate')}
                        variant={mode === 'generate' ? 'default' : 'ghost'}
                        className="flex-1 rounded-full text-sm sm:text-base font-semibold"
                        size="lg"
                    >
                        <Laugh className="mr-2 h-5 w-5"/>
                        Generate Joke
                    </Button>
                    <Button
                        onClick={() => handleModeChange('create')}
                        variant={mode === 'create' ? 'default' : 'ghost'}
                        className="flex-1 rounded-full text-sm sm:text-base font-semibold"
                        size="lg"
                    >
                        <PenSquare className="mr-2 h-5 w-5"/>
                        Create Your Own
                    </Button>
                     <Button
                        onClick={() => handleModeChange('leaderboard')}
                        variant={mode === 'leaderboard' ? 'default' : 'ghost'}
                        className="flex-1 rounded-full text-sm sm:text-base font-semibold"
                        size="lg"
                    >
                        <Trophy className="mr-2 h-5 w-5"/>
                        Leaderboard
                    </Button>
                </div>

                {mode === 'generate' && (
                  <>
                    <JokeCard className="border-primary/50 w-full animate-in fade-in-0 zoom-in-95 duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-amber-400">
                                <Crown className="h-7 w-7" /> Daily Joke Winner
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg sm:text-xl font-medium">{dailyJoke.joke}</p>
                            <div className="flex items-center gap-4 mt-4">
                                <p className="text-sm text-muted-foreground">- by {dailyJoke.creator}</p>
                                <div className="flex items-center gap-1 text-lg font-bold text-green-400">
                                   <span>😂</span>
                                   <span>{dailyJoke.likes}</span>
                                </div>
                            </div>
                        </CardContent>
                    </JokeCard>

                    <section className="w-full space-y-6 animate-in fade-in-0 zoom-in-95 duration-300">
                        <div>
                          <Label className="text-lg font-semibold mb-4 block text-center">1. Choose a Category</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                            {jokeCategories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => handleCategoryChange(cat.id)}
                                data-state={category === cat.id ? 'active' : 'inactive'}
                                className="px-3 py-3 sm:px-4 text-sm font-semibold rounded-full transition-all duration-200 ease-out transform active:scale-95
                                data-[state=inactive]:bg-card data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-card/70 data-[state=inactive]:shadow-md
                                data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105"
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>
                    </section>
                  </>
                )}

                {mode === 'create' && (
                     <Card className="w-full bg-card/90 backdrop-blur-sm shadow-lg border-2 rounded-2xl animate-in fade-in-0 zoom-in-95 duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
                               <Palette className="h-7 w-7" /> 2. Create Your Own
                            </CardTitle>
                            <CardDescription>Upload an image and describe your meme idea, or just generate one!</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div>
                                <Label htmlFor="custom-text" className="font-semibold">Meme Idea</Label>
                                <Textarea
                                    id="custom-text"
                                    placeholder="What do you want your meme to be about?"
                                    value={customMemeText}
                                    onChange={(e) => setCustomMemeText(e.target.value)}
                                    className="mt-2"
                                    rows={3}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <Button onClick={() => fileInputRef.current?.click()} className="flex-1">
                                    <FileUp className="mr-2 h-5 w-5" />
                                    Upload Image (Optional)
                                </Button>
                                <Input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                                 {uploadedImage && (
                                    <div className="relative w-24 h-24 rounded-md overflow-hidden border-2 border-primary">
                                        <img src={uploadedImage} alt="Uploaded preview" className="w-full h-full object-cover" />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-0 right-0 h-6 w-6 rounded-full"
                                            onClick={() => setUploadedImage(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {mode === 'leaderboard' && (
                     <Card className="w-full bg-card/80 backdrop-blur-sm shadow-lg border-2 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold flex items-center"><Trophy className="mr-2 text-yellow-500" /> Weekly Leaderboard</CardTitle>
                            <CardDescription>The best jokes as voted by the community.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Rank</TableHead>
                                        <TableHead>Meme</TableHead>
                                        <TableHead className="text-right">Votes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingLeaderboard ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
                                                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        leaderboard.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-bold text-lg text-center">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-4">
                                                        <img src={item.imageUrl} alt="Meme" className="w-24 h-24 object-cover rounded-md border" />
                                                        <p className="font-medium">{item.joke}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className="font-bold text-primary text-lg">{item.voteCount}</span>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleVote(item.id)}
                                                            disabled={!user || votingStatus[item.id] || (item.voters && item.voters.includes(user.uid))}
                                                        >
                                                            {votingStatus[item.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : '😂 Vote'}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}


                <div className="w-full flex items-center justify-center">
                    {isLoading && (
                         <JokeCard>
                            <CardHeader>
                                <Skeleton className="h-8 w-3/4 rounded-md" />
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                                <Skeleton className="h-48 w-full rounded-md" />
                                <div className="flex justify-end gap-2">
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                </div>
                            </CardContent>
                        </JokeCard>
                    )}
                    
                    {!isLoading && joke && isMemeCategory && (memeImage?.imageDataUri || uploadedImage) && (
                        <JokeCard innerRef={memeCardRef}>
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xl sm:text-2xl font-bold font-headline">Meme Generated!</CardTitle>
                                <div className="flex items-center">
                                    <ShareMenu />
                                    <Button variant="ghost" size="icon" onClick={handleDownloadMeme} aria-label="Download meme" className="rounded-full">
                                        <Download className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="relative">
                                <img src={uploadedImage || memeImage!.imageDataUri} alt="Generated Meme background" className="w-full h-auto rounded-lg border-2" />
                                <div className="absolute inset-0 flex flex-col justify-between p-2 sm:p-4">
                                  <MemeText text={top} />
                                  <MemeText text={bottom} />
                                </div>
                            </CardContent>
                        </JokeCard>
                    )}

                    {!isLoading && joke && (!isMemeCategory || !(memeImage?.imageDataUri || uploadedImage)) && (
                         <JokeCard>
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <CardTitle className="text-xl sm:text-2xl font-bold font-headline">Here's a good one!</CardTitle>
                                <div className="flex items-center">
                                    <ShareMenu />
                                     <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleGenerateAudio(joke.joke)}
                                        disabled={isGeneratingAudio}
                                        aria-label="Read joke aloud"
                                        className="rounded-full"
                                    >
                                        {isGeneratingAudio ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(joke.joke)} aria-label="Copy joke" className="rounded-full">
                                        <Copy className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-lg sm:text-xl font-medium leading-relaxed">{joke.joke}</p>
                                 {audio?.media && (
                                    <div className="mt-4">
                                        <audio controls autoPlay className="w-full">
                                            <source src={audio.media} type="audio/wav" />
                                            Your browser does not support the audio element.
                                        </audio>
                                    </div>
                                )}
                                <div className="flex justify-end items-center space-x-2 mt-6">
                                    <Button variant={selectedReaction === 'laugh' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSelectedReaction('laugh')} className="rounded-full text-2xl transform transition-transform duration-200 hover:scale-125 active:scale-100">
                                        <span>😂</span>
                                    </Button>
                                    <Button variant={selectedReaction === 'neutral' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSelectedReaction('neutral')} className="rounded-full text-2xl transform transition-transform duration-200 hover:scale-125 active:scale-100">
                                        <span>😐</span>
                                    </Button>
                                    <Button variant={selectedReaction === 'unamused' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSelectedReaction('unamused')} className="rounded-full text-2xl transform transition-transform duration-200 hover:scale-125 active:scale-100">
                                        <span>🙄</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </JokeCard>
                    )}
                </div>

                 <div className="w-full flex justify-center p-2 sm:p-4">
                     <div className="bg-card/80 backdrop-blur-lg p-2 rounded-full shadow-lg flex items-center justify-center gap-1 sm:gap-2 border w-full max-w-sm sm:max-w-lg md:max-w-3xl">
                        {mode !== 'leaderboard' && (
                        <Button onClick={handleGenerateJoke} disabled={isLoading || (mode === 'create' && !customMemeText)} size="lg" className="rounded-full font-bold text-base sm:text-lg flex-1 shadow-md h-12 sm:h-14">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-5 w-5" />
                            )}
                            Generate
                        </Button>
                        )}
                        {mode === 'create' && isMemeReady && (
                         <Button onClick={handleSubmit} disabled={isSubmitting || !isMemeReady || !user} size="lg" className="rounded-full font-bold text-base sm:text-lg flex-1 shadow-md h-12 sm:h-14 bg-green-500 hover:bg-green-600">
                             {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Send className="mr-2 h-5 w-5" />}
                             Submit for Glory
                         </Button>
                        )}
                     </div>
                </div>
            </main>
        </div>
    );
}

    
"use client";

import { useState, useEffect } from "react";
import { generateSafeJoke, type GenerateSafeJokeOutput } from "@/ai/flows/generate-safe-joke";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const jokeCategories = [
    { id: "dad jokes", label: "Dad Jokes" },
    { id: "dark humor", label: "Dark Humor" },
    { id: "pick-up lines", label: "Pick-up Lines" },
];

export default function LaughFactoryPage() {
    const [category, setCategory] = useState(jokeCategories[0].id);
    const [safeForWork, setSafeForWork] = useState(true);
    const [joke, setJoke] = useState<GenerateSafeJokeOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (category === 'dark humor') {
            setSafeForWork(false);
        } else {
            setSafeForWork(true);
        }
    }, [category]);

    const handleGenerateJoke = async () => {
        setIsLoading(true);
        setJoke(null);
        try {
            const result = await generateSafeJoke({ category, safeForWork });
            setJoke(result);
        } catch (error) {
            console.error("Failed to generate joke:", error);
            toast({
                title: "Error",
                description: "Oops! Something went wrong while telling a joke. Please try again.",
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

                <div className="w-full bg-card/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border">
                    <div className="space-y-8">
                        <div>
                            <Label className="text-xl font-semibold mb-4 block text-center sm:text-left">Choose a Category</Label>
                            <RadioGroup value={category} onValueChange={handleCategoryChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {jokeCategories.map((cat) => (
                                    <div key={cat.id}>
                                        <RadioGroupItem value={cat.id} id={cat.id} className="sr-only" />
                                        <Label
                                            htmlFor={cat.id}
                                            className="flex flex-col items-center justify-center rounded-lg border-2 p-4 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer data-[state=checked]:border-primary data-[state=checked]:ring-2 data-[state=checked]:ring-primary"
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
                                disabled={category === 'dark humor'}
                            />
                        </div>

                        <Button onClick={handleGenerateJoke} disabled={isLoading} size="lg" className="w-full text-lg font-bold">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-6 w-6" />
                            )}
                            Generate Joke
                        </Button>
                    </div>
                </div>
                
                <div className="w-full min-h-[200px]">
                    {isLoading && (
                        <Card className="w-full animate-pulse bg-card/80">
                            <CardHeader>
                                <Skeleton className="h-8 w-3/4 rounded-md" />
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                                <Skeleton className="h-6 w-full rounded-md" />
                                <Skeleton className="h-6 w-5/6 rounded-md" />
                            </CardContent>
                        </Card>
                    )}
                    
                    {joke && !isLoading && (
                         <Card className="w-full animate-in fade-in-0 zoom-in-95 duration-500 bg-card/80 backdrop-blur-sm shadow-lg border">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <CardTitle className="text-2xl font-bold text-primary">Here's a good one!</CardTitle>
                                <Button variant="ghost" size="icon" onClick={handleCopyToClipboard} aria-label="Copy joke">
                                    <Copy className="h-5 w-5" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-medium leading-relaxed">{joke.joke}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}

var musicLibrary = [
    {
        Title: "A Hard Day's Night",
        Artist: "The Beatles",
        Year: 1964,
        Slug: 'a-hard-days-night',
        IsFavorite: false,
        Songs: [
            {
                Title: "A Hard Day's Night",
                Artist: "Lennon and McCartney"
            },
            {
                Title: "I Should Have Known Better",
                Artist: "Lennon"
            },
            {
                Title: "If I Fell",
                Artist: "Lennon and McCartney"
            },
            {
                Title: "I'm Happy Just to Dance with You",
                Artist: "Harrison"
            },
            {
                Title: "And I Love Her",
                Artist: "McCartney"
            },
            {
                Title: "Tell Me Why",
                Artist: "Lennon with McCartney"
            },
            {
                Title: "Can't Buy Me Love",
                Artist: "McCartney"
            },
            {
                Title: "Any Time at All",
                Artist: "Lennon"
            },
            {
                Title: "I'll Cry Instead",
                Artist: "Lennon"
            },
            {
                Title: "Things We Said Today",
                Artist: "McCartney"
            },
            {
                Title: "When I Get Home",
                Artist: "Lennon"
            },
            {
                Title: "You Can't Do That",
                Artist: "Lennon"
            },
            {
                Title: "I'll Be Back",
                Artist: "Lennon with McCartney"
            }
            
        ]
    },
    {
        Title: "Superunknown",
        Artist: "Soundgarden",
        Year: 1994,
        Slug: 'superunknown',
        IsFavorite: false,
        Songs: [
            {
                Title: "Let Me Down",
                Artist: "Soundgarden"
            },
            {
                Title: "My Wave",
                Artist: "Cornell, Kim Thayil"
            },
            {
                Title: "Fell on Black Days",
                Artist: "Soundgarden"
            },
            {
                Title: "Mailman",
                Artist: "Matt Cameron"
            },
            {
                Title: "Superunknown",
                Artist: "Cornell, Thayil"
            },
            {
                Title: "Head Down",
                Artist: "Shepherd"
            },
            {
                Title: "Black Hole Sun",
                Artist: "Soundgarden"
            },         
            {
                Title: "Spoonman",
                Artist: "Soundgarden"
            },
            {
                Title: "Limo Wreck",
                Artist: "Cameron, Thayil"
            },
            {
                Title: "The Day I Tried to Live",
                Artist: "Soundgarden"
            },
            {
                Title: "Kickstand",
                Artist: "Thayil"
            },
            {
                Title: "Fresh Tendrils",
                Artist: "Cornell, Cameron"
            },
            {
                Title: "4th of July",
                Artist: "Soundgarden"
            },
            {
                Title: "Half",
                Artist: "Shepherd"
            },
            {
                Title: "Like Suicide",
                Artist: "Shepherd"
            }
        ]
    },
    {
        Title: "Brothers in Arms",
        Artist: "Dire Straits",
        Year: 1985,
        Slug: "brothers-in-arms",
        IsFavorite: true,
        Songs: [
            {
                Title: "So Far Away",
                Artist: "Dire Straits"
            },
            {
                Title: "Money For Nothing",
                Artist: "Dire Straits with Sting"
            },
            {
                Title: "Your Latest Trick",
                Artist: "Dire Straits"
            },
            {
                Title: "Why Worry",
                Artist: "Dire Straits"
            },
            {
                Title: "Ride Across the River",
                Artist: "Dire Straits"
            },
            {
                Title: "The Man's Too Strong",
                Artist: "Dire Straits"
            },
            {
                Title: "One World",
                Artist: "Dire Straits"
            },
            {
                Title: "Brothers in Arms",
                Artist: "Dire Straits"
            }
        ]
    }
];

var orgHierarchyData = {
    Name: 'Initech',
    Boss: {
        Name: 'Initech Board',
        Title: 'Board of Directors'
    },
    ChildOrgs: [
        {
            Name: 'Development',
            Boss: {
                Name: 'Bill Lumberg',
                Title: 'Vice President of Development'
            },
            Peons: [
                {
                    Name: 'Michael Bolton',
                    Title: 'Peon #1'
                },
                {
                    Name: 'Samir Notgonnaworkhereanymore',
                    Title: 'Peon #2'
                },
                {
                    Name: 'Peter Gibbons',
                    Title: 'Peon #3'
                }
            ]
        },
        {
            Name: 'Process Improvemnt',
            Boss: {
                Name: 'Bob',
                Title: 'Head Consultant'
            },
            Peons: [
                {
                    Name: 'Bob',
                    Title: 'Assistant Consultant'
                }
            ]
        }
    ]
}

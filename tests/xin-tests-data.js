var musicLibrary = [
    {
        Title: "A Hard Day's Night",
        Artist: "The Beatles",
        Slug: 'a-hard-days-night',
        IsFavorite: false,
        Songs: [
            {
                Title: "A Hard Day's Night",
                Artist: "The Beatles"
            },
            {
                Title: "If I Fell in Love",
                Artist: "Paul McCartney",
            },
            {
                Title: "Can't Buy Me Love",
                Artist: "John Lennon"
            }
        ]
    },
    {
        Title: "Superunknown",
        Artist: "The Beatles",
        Slug: 'superunknown',
        IsFavorite: true,
        Songs: [
            {
                Title: "Spoon Man",
                Artist: "Sound Garden"
            },
            {
                Title: "Black Hole Sun",
                Artist: "Sound Garden"
            }
        ]
    },
    {
        Title: "Big Ones",
        Artist: "Aerosmith",
        Slug: "big-ones",
        IsFavorite: false,
        Songs: [
            {
                Title: "Walk on Water",
                Artist: "Aerosmith"
            },
            {
                Title: "Love in an Elevator",
                Artist: "Aerosmith"
            },
            {
                Title: "Rag Doll",
                Artist: "Aerosmith"
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

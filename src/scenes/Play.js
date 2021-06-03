class Play extends Phaser.Scene{
    constructor(){
        super("playScene");
    }

    preload(){
        this.load.image('player', 'assets/knight_idle_in.png');
        this.load.image('player_reel', 'assets/knight_reel_in.png');
        this.load.image('background', 'assets/skyWide.png');

        this.load.image('base_tiles', 'assets/tilemap/tilemap.png');
        this.load.tilemapTiledJSON('tilemap_full', 'assets/tilemap/FishingHero_TileMap_FullLevel.json');
    }   

    create(){
        this.background = this.add.image(625, -2500, 'background');
        this.background.setScale(3, 5);

        //sounds
        this.click = this.sound.add('click');
        this.click.setLoop(true);
        this.throw = this.sound.add('throw');
        
        // Create the Tilemap
        this.mapConfig = {
            key: 'tilemap_full',
            tileWidth: 64,
            tileHeight: 64
        }
        this.map = this.make.tilemap(this.mapConfig);
        
        // add the tileset image we are using
        this.tileset = this.map.addTilesetImage('Tower_new', 'base_tiles', 64, 64);

        // Create the layers we want
        this.backgroundLayer = this.map.createLayer('Background', this.tileset);
        this.backgroundLayer.setCollisionByProperty({ collides: true });

        this.platformLayer = this.map.createLayer('Platforms', this.tileset);
        this.platformLayer.setCollisionByProperty({ collides: true });

        this.wallLayer = this.map.createLayer('Wall', this.tileset);
        this.wallLayer.setCollisionByProperty({ collides: true });
        
        //setup player with state machine
        const playerSpawn = this.map.findObject("Points", obj => obj.name === "spawnPoint");
        this.player = new Player(this, playerSpawn.x, playerSpawn.y, 'player').setOrigin(0, 0);
        this.resetPos = playerSpawn.y;
        //console.log(this.player.x, this.player.y);
        this.player.body.collideWorldBounds=true;
        this.playerFSM = new StateMachine('idle', {
            idle: new IdleState(),
            move: new MoveState(),
            aim: new AimState(),
            cast: new CastState(),
            reel: new ReelState(),
            freefall: new FreefallState(),
            hurt: new HurtState(),
        }, [this]);
        this.player.body.collideWorldBounds=false;
        this.bounces = 0;

        //setup hook
        this.hook;
        this.arrow;
        this.throwPosition = new Phaser.Math.Vector2();

        // enemies
        this.enemiesGroup = this.add.group(
            this.map.createFromObjects("Enemies", {
                classType: Enemy,
                key: 'enemy'
            })
        );

        // enemy colliders
        this.physics.add.collider(this.enemiesGroup, this.player, (e, p)=>{
            this.playerFSM.transition('hurt');
        });
        this.physics.add.collider(this.enemiesGroup, this.platformLayer);
        this.physics.add.collider(this.enemiesGroup, this.wallLayer);

        // INPUTS:
        // mouse stuff
        this.mouseDownX;
        this.mouseDownY;
        this.mouseDownPosition = new Phaser.Math.Vector2();
        this.mouseUpX;
        this.mouseUpY;
        this.mouseUpPosition = new Phaser.Math.Vector2();

        // keyboard keys
        keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        keyF = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

        // hook shenanigans
        this.input.on('pointerdown', function (pointer) {
            if(this.playerFSM.state == 'idle'){
                if(!this.player.flipX){
                    this.throwPosition.set(this.player.x, this.player.y);
                }
                else{
                    this.throwPosition.set(this.player.x + this.player.width, this.player.y);
                }
                this.playerFSM.transition('aim');
                console.log('down');
                this.mouseDownX = pointer.x;
                this.mouseDownY = pointer.y;
                this.mouseDownPosition.set(this.mouseDownX,this.mouseDownY);
            }
            else if(this.playerFSM.state == 'cast'){
                this.playerFSM.transition('idle');
                this.hook.destroy();
                activeHook = 0;
            }
            else if(this.playerFSM.state == 'reel'){
                this.playerFSM.transition('freefall');
                this.hook.destroy();
                activeHook = 0;
            }
        }, this); 

        this.input.on('pointermove', function (pointer) {
            if(this.playerFSM.state == 'aim'){
                this.mouseUpX = pointer.x;
                this.mouseUpY = pointer.y;
                this.mouseUpPosition.set(this.mouseUpX,this.mouseUpY);
                this.arrowAngle = Phaser.Math.Angle.BetweenPoints(this.mouseDownPosition, this.mouseUpPosition);
            }
        }, this);

        this.input.on('pointerup', function (pointer) {
            if(this.playerFSM.state == 'aim'){
                console.log('up');
                //calculate vector
                let diffX = pointer.x - this.mouseDownX;
                let diffY = pointer.y - this.mouseDownY;
                console.log('diffX: '+ diffX + '\ndiffY: ' + diffY);
                this.hook.launch(-diffX,-diffY);
                activeHook = 1;
                this.throw.play();
                this.playerFSM.transition('cast');
                this.arrow.destroy();
            }
        }, this);

        //rope
        graphics = this.add.graphics();
        this.outerRope;
        this.innerRope;
        this.startPoint;
        this.controlPoint;
        this.endPoint;

        //this.physics.add.collider(this.player, this.platformLayer);
        this.physics.add.collider(this.player, this.wallLayer, (p,g)=>{
            if(this.playerFSM.state == 'hurt'){
                this.bounces++;
            } else if (this.playerFSM.state == 'idle'){
                if(this.player.x > 604 && this.player.x < 996 && this.player.y < 1628 && convoCounter == -1) {
                    if(this.player.x <= game.config.width / 2) {
                        dialogueSide = 0;
                    } else {
                        dialogueSide = 1;
                    }
                    playerX = this.player.x;
                    playerY = this.player.y;
                    if(convoCounter < 3) {
                        if(convoCounter == -1) {
                            convoCounter++;
                        }
                        this.scene.pause();
                        this.scene.launch('dialogueScene');
                    }
                }
            }
        }); 
        this.physics.add.collider(this.player, this.platformLayer, (p,g)=>{
            if(this.playerFSM.state == 'reel'){
                this.playerFSM.transition('freefall');
            }
            else if(this.playerFSM.state == 'hurt'){
                this.bounces++;
            }
        });
        this.cameras.main.startFollow(this.player, false, .5, .5, 0, 50);
        //this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(275, -10000, 1280, 20000, true);
        this.cameras.main.setZoom(.9,.9);
        keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.player.body.setMaxSpeed(2000);

        //this.dialoguePoint = this.map.findObject("Storypoints", obj => obj.name === "storypoint");
    }

    drawRope(){
        //curved rope when throwing
        if(this.playerFSM.state == 'cast'){
            graphics.lineStyle(5, 0xffffff, 1);
            if(!this.player.flipX){
                this.startPoint = new Phaser.Math.Vector2(this.player.x, this.player.y);
                this.controlPoint = new Phaser.Math.Vector2(this.player.x, this.hook.y);
            }
            else{
                this.startPoint = new Phaser.Math.Vector2(this.player.x + this.player.width, this.player.y);
                this.controlPoint = new Phaser.Math.Vector2(this.player.x + this.player.width, this.hook.y);
            }
            this.endPoint = new Phaser.Math.Vector2(this.hook.x, this.hook.y);
            this.outerRope = new Phaser.Curves.CubicBezier(this.startPoint, this.controlPoint, this.endPoint, this.endPoint);
            this.outerRope.draw(graphics);
            graphics.lineStyle(3, 0x808080, 1);
            this.innerRope = new Phaser.Curves.CubicBezier(this.startPoint, this.controlPoint, this.endPoint, this.endPoint);
            this.innerRope.draw(graphics);
        }
        else if(this.playerFSM.state == 'reel'){
            graphics.lineStyle(5, 0xffffff, 1);
            if(!this.player.flipX){
                this.startPoint = new Phaser.Math.Vector2(this.player.x, this.player.y);
            }
            else{
                this.startPoint = new Phaser.Math.Vector2(this.player.x + this.player.width, this.player.y);
            }
            this.endPoint = new Phaser.Math.Vector2(this.hook.x, this.hook.y);
            this.outerRope = new Phaser.Curves.CubicBezier(this.startPoint, this.startPoint, this.endPoint, this.endPoint);
            this.outerRope.draw(graphics);
            graphics.lineStyle(3, 0x808080, 1);
            this.innerRope = new Phaser.Curves.CubicBezier(this.startPoint, this.startPoint, this.endPoint, this.endPoint);
            this.innerRope.draw(graphics);
        }
    }

    update(){
        graphics.clear();
        //redraw the rope
        if(this.playerFSM.state == 'cast' || this.playerFSM.state == 'reel'){
            this.drawRope();
        }
        this.playerFSM.step();
        if(keySpace.isDown){
            this.player.body.setVelocityY(-2000);
        }
        if(Phaser.Input.Keyboard.JustDown(keyF)){
            
            if(this.player.x <= game.config.width / 2) {
                dialogueSide = 0;
            } else {
                dialogueSide = 1;
            }
            playerX = this.player.x;
            playerY = this.player.y;
            if(convoCounter < 3) {
                if(convoCounter == -1) {
                    convoCounter++;
                }
                this.scene.pause();
                this.scene.launch('dialogueScene');
            }
        }
        if(this.player.body.velocity.y > 1000) {
            this.player.body.velocity.y = 1000;
        }
        if(this.player.y > 1950) {
            this.player.body.setVelocityY(0);
            this.player.y = this.resetPos - 50;
        }
    }
}

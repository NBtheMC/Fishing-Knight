class Hook extends Phaser.Physics.Arcade.Sprite{
    constructor(scene, x, y, texture, frame){
        super(scene, x, y, texture, frame);
        //add to scene
        scene.add.existing(this);     
        scene.physics.add.existing(this);
        scene.physics.add.collider(this, scene.platformLayer, (h,g) => {
            h.body.setImmovable(true);
            h.body.setVelocity(0,0);
            h.body.setAllowGravity(false);
            scene.click.play();
            scene.playerFSM.transition('reel');
        });
        if(scene.playerFSM.state == 'reel'){
            scene.physics.add.overlap(this, scene.player, function(h,p){
                h.destroy();
                scene.playerFSM.transition('freefall');
            });
        }
        //reeling enemy
        scene.physics.add.overlap(this, scene.fish1, (h, e)=>{
            h.moveToPlayer(scene.player);
            e.moveToPlayer(scene.player);
        });
        scene.physics.add.overlap(this, scene.fish2, (h, e)=>{
            h.moveToPlayer(scene.player);
            e.moveToPlayer(scene.player);
        });
        scene.physics.add.overlap(this, scene.fish3, (h, e)=>{
            h.moveToPlayer(scene.player);
            e.moveToPlayer(scene.player);
        });
        this.setScale(.25);
        this.allowGravity = false;
    }

    launch(xPower, yPower){
        xPower = Phaser.Math.Clamp(xPower, -250, 250);
        yPower = Phaser.Math.Clamp(yPower, -250, 250);
        this.setVelocity(4*xPower, 4*yPower);
    }

    moveToPlayer(player){
       this.body.setVelocity(player.x - this.x, player.y - this.y);
    }
}